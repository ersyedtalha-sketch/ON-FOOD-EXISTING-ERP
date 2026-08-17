-- ============================================================
-- ON FOOD ERP — Step 4: Batch traceability, expiry and FEFO
--
-- Run this ONCE in Supabase → SQL Editor, after 03-invoice-on-delivery.sql.
--
-- The question this exists to answer, in one query, on the day it is
-- asked by a food safety officer:
--
--     "Batch B-019 is contaminated. Who ate it?"
--
-- Today the ERP cannot answer it. `batches` records what was produced
-- and `orders` records what was sold, but nothing links the two, so
-- there is no path from a batch to the customers who received it. There
-- is also no expiry date anywhere, which means nothing stops expired
-- stock being picked and sold.
--
-- Both are schema changes. They are cheap now, while the data is fake.
-- After go-live they are a migration of live stock and historical
-- invoices.
--
-- Every statement is safe to run twice.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Batches get dates
--
-- expiry_date is the one that matters. It drives picking order, it
-- blocks expired stock from being sold, and it is what you search on
-- when something goes wrong.
-- ------------------------------------------------------------

alter table batches add column if not exists mfg_date        date;
alter table batches add column if not exists expiry_date     date;
alter table batches add column if not exists shelf_life_days integer;

-- Backfill manufacture date from the production date already recorded.
update batches set mfg_date = produced_on where mfg_date is null;

-- If a shelf life is given, the expiry follows from it.
create or replace function batches_set_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.mfg_date is null then
    new.mfg_date := coalesce(new.produced_on, current_date);
  end if;

  if new.expiry_date is null and new.shelf_life_days is not null then
    new.expiry_date := new.mfg_date + new.shelf_life_days;
  end if;

  if new.expiry_date is not null and new.expiry_date < new.mfg_date then
    raise exception 'Batch % expires (%) before it was made (%)',
      new.batch_no, new.expiry_date, new.mfg_date;
  end if;

  return new;
end;
$$;

drop trigger if exists batches_expiry_trg on batches;
create trigger batches_expiry_trg before insert or update on batches
  for each row execute function batches_set_expiry();

create index if not exists batches_expiry_idx  on batches (expiry_date);
create index if not exists batches_product_idx on batches (product_name, expiry_date);


-- ------------------------------------------------------------
-- 2. The stock ledger
--
-- Append-only. Every movement of finished goods is a row, positive in,
-- negative out. Nothing is ever edited or deleted — a correction is a
-- new row in the opposite direction, so the history of what you told
-- yourself at the time survives.
--
-- This matters beyond tidiness. If stock rows can be edited, then after
-- an incident you cannot prove what stock was where, and the trace is
-- worth nothing.
-- ------------------------------------------------------------

create table if not exists stock_moves (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches(id) on delete restrict,
  product_name  text not null,
  qty           numeric not null check (qty <> 0),   -- + into stock, - out of stock
  reason        text not null
                  check (reason in ('production','sale','wastage','expired','return','adjustment')),
  order_id      uuid references orders(id) on delete set null,
  order_item_id uuid references order_items(id) on delete set null,
  note          text,
  moved_at      timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

create index if not exists stock_moves_batch_idx   on stock_moves (batch_id);
create index if not exists stock_moves_order_idx   on stock_moves (order_id);
create index if not exists stock_moves_product_idx on stock_moves (product_name, moved_at);

-- Enforce append-only at the table, not by convention.
create or replace function stock_moves_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock_moves is append-only. To correct a movement, insert an opposing row.'
    using hint = 'Use reason = ''adjustment'' with the opposite sign.';
end;
$$;

drop trigger if exists stock_moves_no_update on stock_moves;
create trigger stock_moves_no_update before update or delete on stock_moves
  for each row execute function stock_moves_immutable();


-- Production puts finished goods into stock automatically.
create or replace function batches_record_production()
returns trigger
language plpgsql
as $$
begin
  if new.output_units > 0 then
    insert into stock_moves (batch_id, product_name, qty, reason, note)
    values (new.id, new.product_name, new.output_units, 'production',
            'Batch ' || new.batch_no);
  end if;
  return new;
end;
$$;

drop trigger if exists batches_production_trg on batches;
create trigger batches_production_trg after insert on batches
  for each row execute function batches_record_production();


-- ------------------------------------------------------------
-- 3. What is actually on hand
--
-- Derived from the ledger rather than stored, so it cannot drift away
-- from the movements that produced it.
-- ------------------------------------------------------------

create or replace view batch_stock as
select
  b.id            as batch_id,
  b.batch_no,
  b.product_name,
  b.mfg_date,
  b.expiry_date,
  b.output_units  as produced,
  coalesce(sum(sm.qty), 0) as on_hand,
  case
    when b.expiry_date is null            then 'no expiry set'
    when b.expiry_date <  current_date    then 'expired'
    when b.expiry_date <= current_date + 2 then 'expiring'
    else 'ok'
  end as expiry_state,
  b.expiry_date - current_date as days_left
from batches b
left join stock_moves sm on sm.batch_id = b.id
group by b.id, b.batch_no, b.product_name, b.mfg_date, b.expiry_date, b.output_units;


-- What to use up first, and what to pull off the shelf today.
create or replace view expiry_watch as
select *
from batch_stock
where on_hand > 0
  and expiry_state in ('expired','expiring')
order by expiry_date nulls last;


-- ------------------------------------------------------------
-- 4. FEFO picking
--
-- First Expired, First Out — not FIFO. For food they differ whenever a
-- shorter-dated batch is made after a longer-dated one, and picking by
-- production order then leaves the soonest-to-expire stock sitting on
-- the shelf until it is waste.
--
-- Expired batches are never allocated. If the only stock of a product
-- has expired, this raises rather than quietly selling it.
-- ------------------------------------------------------------

create or replace function allocate_fefo(
  p_product       text,
  p_qty           numeric,
  p_order_id      uuid default null,
  p_order_item_id uuid default null,
  p_note          text default null
)
returns table (batch_id uuid, batch_no text, qty_taken numeric, expiry_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_left      numeric := p_qty;
  v_take      numeric;
  v_avail     numeric;
  v_expired   numeric;
  v_usable    numeric;
  r           record;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity to allocate must be positive, got %', p_qty;
  end if;

  -- Measured before anything is taken, so the shortfall message reports
  -- what the stock actually looked like rather than what is left after a
  -- partial allocation that is about to be rolled back.
  select coalesce(sum(bs.on_hand) filter (where bs.expiry_state <> 'expired'), 0),
         coalesce(sum(bs.on_hand) filter (where bs.expiry_state =  'expired'), 0)
    into v_usable, v_expired
    from batch_stock bs
   where bs.product_name = p_product;

  -- Candidate batches, soonest expiry first. The rows are locked here and
  -- the balance is read afterwards, inside the loop — Postgres refuses
  -- FOR UPDATE alongside GROUP BY, and taking the lock before reading is
  -- the correct order anyway: two simultaneous deliveries then queue up
  -- instead of both seeing the same units as available.
  for r in
    select b.id, b.batch_no, b.expiry_date
    from batches b
    where b.product_name = p_product
      and (b.expiry_date is null or b.expiry_date >= current_date)
    order by b.expiry_date nulls last, b.produced_on, b.batch_no
    for update
  loop
    exit when v_left <= 0;

    select coalesce(sum(sm.qty), 0) into v_avail
      from stock_moves sm where sm.batch_id = r.id;
    continue when v_avail <= 0;

    v_take := least(v_avail, v_left);

    insert into stock_moves (batch_id, product_name, qty, reason, order_id, order_item_id, note)
    values (r.id, p_product, -v_take, 'sale', p_order_id, p_order_item_id, p_note);

    batch_id    := r.id;
    batch_no    := r.batch_no;
    qty_taken   := v_take;
    expiry_date := r.expiry_date;
    return next;

    v_left := v_left - v_take;
  end loop;

  if v_left > 0 then
    raise exception
      'Not enough %: need %, only % usable in stock.%',
      p_product, p_qty, v_usable,
      case when v_expired > 0
           then ' A further ' || v_expired || ' has expired and cannot be sold.'
           else '' end
      using hint = 'Record the production batch first, or reduce the order quantity.';
  end if;

  return;
end;
$$;


-- ------------------------------------------------------------
-- 5. Consume stock when the order is delivered
--
-- Same moment the invoice is raised, so what was invoiced and what left
-- the shelf can never disagree.
--
-- If there is not enough stock the delivery fails. That is deliberate:
-- goods leaving without a batch behind them is exactly the hole that
-- makes a recall unanswerable. Fix the stock, then mark it delivered.
-- ------------------------------------------------------------

create or replace function orders_consume_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare it record;
begin
  if new.fulfilment_status = 'delivered'
     and coalesce(old.fulfilment_status, '') <> 'delivered' then

    -- Already allocated? Then this is a repeat and must not double-consume.
    if exists (select 1 from stock_moves where order_id = new.id and reason = 'sale') then
      return new;
    end if;

    for it in
      select id, product_name, pcs_per_pack * quantity as units
      from order_items where order_id = new.id
    loop
      perform allocate_fefo(it.product_name, it.units, new.id, it.id,
                            'Order ' || new.order_no);
    end loop;
  end if;
  return new;
end;
$$;

-- Runs before the invoicing trigger (alphabetical by trigger name), so a
-- stock shortfall stops the delivery before an invoice number is spent.
drop trigger if exists orders_consume_stock_trg on orders;
create trigger orders_consume_stock_trg
  after update of fulfilment_status on orders
  for each row execute function orders_consume_stock();


-- ------------------------------------------------------------
-- 6. The recall queries
--
-- Both directions, because an incident is investigated from either end.
-- ------------------------------------------------------------

-- Batch -> who received it. This is the food safety officer's question.
create or replace view batch_recall as
select
  b.batch_no,
  b.product_name,
  b.mfg_date,
  b.expiry_date,
  -sm.qty                                   as units_sent,
  o.order_no,
  o.delivered_at,
  p.name                                    as customer,
  p.customer_type,
  coalesce(p.contact_phone, p.phone)        as phone,
  coalesce(o.delivery_address, p.delivery_address) as address,
  i.invoice_no
from stock_moves sm
join batches  b on b.id = sm.batch_id
left join orders   o on o.id = sm.order_id
left join partners p on p.id = o.partner_id
left join invoices i on i.id = o.invoice_id
where sm.reason = 'sale'
order by b.batch_no, o.delivered_at;

-- Customer -> which batches they were given, for a complaint about one
-- delivery rather than one batch.
create or replace view customer_batches as
select
  p.name                as customer,
  o.order_no,
  o.delivered_at,
  b.batch_no,
  b.product_name,
  -sm.qty               as units,
  b.expiry_date
from stock_moves sm
join batches  b on b.id = sm.batch_id
join orders   o on o.id = sm.order_id
join partners p on p.id = o.partner_id
where sm.reason = 'sale'
order by o.delivered_at desc, b.batch_no;


-- ------------------------------------------------------------
-- 7. Writing off expired stock
--
-- Expired units stay on the ledger until written off, so the loss is
-- visible rather than quietly disappearing.
-- ------------------------------------------------------------

create or replace function write_off_expired(p_as_of date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0; r record;
begin
  for r in
    select batch_id, product_name, on_hand
    from batch_stock
    where expiry_date is not null and expiry_date < p_as_of and on_hand > 0
  loop
    insert into stock_moves (batch_id, product_name, qty, reason, note)
    values (r.batch_id, r.product_name, -r.on_hand, 'expired',
            'Written off ' || p_as_of);
    n := n + 1;
  end loop;
  return n;
end;
$$;


-- ------------------------------------------------------------
-- 8. Access
--
-- Stock and batch data is operations. A salesperson has no access, in
-- keeping with 02-orders-and-sales.sql.
-- ------------------------------------------------------------

alter table stock_moves enable row level security;

drop policy if exists "stock_moves ops read" on stock_moves;
create policy "stock_moves ops read" on stock_moves
  for select to authenticated using (my_role() in ('admin','supervisor'));

drop policy if exists "stock_moves ops insert" on stock_moves;
create policy "stock_moves ops insert" on stock_moves
  for insert to authenticated with check (my_role() in ('admin','supervisor'));
