-- ============================================================
-- ON FOOD ERP — Step 2: Enquiries, Orders, and the Salesperson role
--
-- Run this ONCE in Supabase → SQL Editor, after schema.sql and
-- profiles-and-roles.sql have already been run.
--
-- What this adds, and why:
--
--   1. Enquiries      — a customer asking about products (WhatsApp,
--                       phone, walk-in) before any order exists.
--   2. Orders         — the missing middle. Today the ERP jumps
--                       straight to an invoice, so there is nowhere to
--                       record "ordered but not yet delivered".
--   3. B2B customers  — restaurants, hotels and stores need contact
--                       person, delivery address, GSTIN and credit terms.
--   4. Salesperson    — a third role that can manage customers and
--                       orders, and nothing else.
--   5. Gapless numbering for orders and invoices, safe under
--                       simultaneous writes.
--
-- Every statement is written to be safe to run twice.
-- ============================================================


-- ------------------------------------------------------------
-- 1. B2B customer details
--
-- partners already holds name, phone, gstin and state, which is what
-- the invoice engine needs to pick CGST+SGST vs IGST. These columns
-- add what a salesperson needs in the field.
-- ------------------------------------------------------------

alter table partners add column if not exists customer_type   text;
alter table partners add column if not exists contact_person  text;
alter table partners add column if not exists contact_phone   text;
alter table partners add column if not exists delivery_address text;
alter table partners add column if not exists area            text;
alter table partners add column if not exists credit_days     integer not null default 0;
alter table partners add column if not exists credit_limit    numeric not null default 0;
alter table partners add column if not exists whatsapp_optin  boolean not null default false;
alter table partners add column if not exists optin_recorded_at timestamptz;
alter table partners add column if not exists created_by      uuid references auth.users(id) on delete set null;
alter table partners add column if not exists is_active       boolean not null default true;

-- Restaurant / Hotel / Store etc. Kept separate from partners.role
-- ('Supplier' / 'Customer' / ...) so the existing role logic is untouched.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partners_customer_type_chk') then
    alter table partners add constraint partners_customer_type_chk
      check (customer_type is null or customer_type in
        ('Restaurant','Hotel','Store','Supermarket','Caterer','Cloud Kitchen','Wholesaler','Retail','Other'));
  end if;
end $$;

-- A GSTIN, when present, must be well-formed. A malformed GSTIN on a B2B
-- invoice makes the customer unable to claim input tax credit, and shows
-- up as an error in your GSTR-1.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partners_gstin_chk') then
    alter table partners add constraint partners_gstin_chk
      check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$');
  end if;
end $$;

create index if not exists partners_customer_type_idx on partners (customer_type) where is_active;
create index if not exists partners_created_by_idx    on partners (created_by);


-- ------------------------------------------------------------
-- 2. Enquiries
--
-- "Customer ordered through WhatsApp post enquiry" — the enquiry is a
-- record in its own right. It is what tells you how many conversations
-- turn into orders, and it is where a WhatsApp thread first lands.
-- ------------------------------------------------------------

create table if not exists enquiries (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid references partners(id) on delete set null,
  phone           text,                       -- for a first-time enquirer with no partner row yet
  contact_name    text,
  channel         text not null default 'whatsapp'
                    check (channel in ('whatsapp','phone','walk-in','web','salesperson','other')),
  channel_ref     text,                       -- WhatsApp message id, so a redelivery cannot duplicate it
  message         text,
  status          text not null default 'open'
                    check (status in ('open','quoted','converted','lost')),
  lost_reason     text,
  handled_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists enquiries_channel_ref_uidx
  on enquiries (channel, channel_ref) where channel_ref is not null;
create index if not exists enquiries_status_idx  on enquiries (status, created_at desc);
create index if not exists enquiries_partner_idx on enquiries (partner_id);


-- ------------------------------------------------------------
-- 3. Orders
--
-- One table for every intake route: a WhatsApp message, a payment
-- gateway checkout, or a salesperson standing in a restaurant kitchen.
-- They differ only in `source`.
--
-- Note the two separate status columns. This matters:
--
--   fulfilment_status — where the goods are   (pending → delivered)
--   invoices.status   — where the money is    (pending → paid)
--
-- These are genuinely different questions. "Delivered but unpaid" is
-- the normal state of a B2B food order on credit terms, and you cannot
-- express it with one column.
-- ------------------------------------------------------------

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  order_no          text not null unique,     -- "ORD-2026-0001"
  partner_id        uuid references partners(id) on delete restrict,
  enquiry_id        uuid references enquiries(id) on delete set null,

  source            text not null default 'salesperson'
                      check (source in ('whatsapp','gateway','salesperson','phone','walk-in')),
  -- The provider's own id for this event: WhatsApp message id, Razorpay
  -- payment id. Webhooks retry on timeout, and without this a retry
  -- creates a second order and a second invoice for the same money.
  source_ref        text,

  -- "He can also mention at what time the customer wants the products."
  requested_for     timestamptz,              -- the delivery date and time asked for
  requested_slot    text,                     -- or a named window, e.g. "6-8 AM"

  fulfilment_status text not null default 'pending'
                      check (fulfilment_status in ('pending','packed','dispatched','delivered','cancelled')),
  delivered_at      timestamptz,
  delivered_by      uuid references auth.users(id) on delete set null,
  cancelled_reason  text,

  delivery_address  text,                     -- copied from the partner, editable per order
  notes             text,

  invoice_id        uuid references invoices(id) on delete set null,

  created_by        uuid references auth.users(id) on delete set null,  -- the salesperson
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- A delivered order must carry the moment it was delivered, and a
  -- pending one must not pretend it has been.
  constraint orders_delivered_at_chk check (
    (fulfilment_status = 'delivered' and delivered_at is not null)
    or (fulfilment_status <> 'delivered' and delivered_at is null)
  )
);

create unique index if not exists orders_source_ref_uidx
  on orders (source, source_ref) where source_ref is not null;
create index if not exists orders_status_idx    on orders (fulfilment_status, requested_for);
create index if not exists orders_partner_idx   on orders (partner_id, created_at desc);
create index if not exists orders_createdby_idx on orders (created_by, created_at desc);


create table if not exists order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  product_name    text not null,
  hsn             text,
  pcs_per_pack    numeric not null default 1,
  quantity        numeric not null default 0,   -- number of packs ordered
  rate_per_piece  numeric not null default 0,
  gst_rate        numeric not null default 5,
  -- Stored, not computed on read, so a later price change never rewrites
  -- the history of an order that was already placed.
  taxable_value   numeric not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists order_items_order_idx on order_items (order_id);


-- ------------------------------------------------------------
-- 4. Gapless numbering, safe under simultaneous writes
--
-- The app currently derives the next invoice number from max(). That is
-- fine when one person clicks a button. When two webhooks arrive in the
-- same second, both read the same maximum and both write the same
-- invoice number — and duplicate invoice numbers are exactly what a GST
-- audit looks for.
--
-- A counter row locked per financial year fixes it. Each caller waits
-- its turn, so numbers are unique and have no gaps.
-- ------------------------------------------------------------

create table if not exists doc_counters (
  doc_type   text not null,          -- 'invoice' | 'order'
  fy         text not null,          -- '2026-27'
  last_no    integer not null default 0,
  primary key (doc_type, fy)
);

-- Indian financial year: 1 April to 31 March.
create or replace function fy_of(ts timestamptz default now())
returns text
language sql
immutable
as $$
  select case
    when extract(month from ts) >= 4
      then to_char(ts, 'YYYY') || '-' || to_char(ts + interval '1 year', 'YY')
    else to_char(ts - interval '1 year', 'YYYY') || '-' || to_char(ts, 'YY')
  end;
$$;

create or replace function next_doc_no(p_doc_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy   text := fy_of();
  v_next integer;
begin
  insert into doc_counters (doc_type, fy, last_no)
  values (p_doc_type, v_fy, 0)
  on conflict (doc_type, fy) do nothing;

  -- UPDATE ... RETURNING takes a row lock, so simultaneous callers queue
  -- here instead of both reading the same number.
  update doc_counters
     set last_no = last_no + 1
   where doc_type = p_doc_type and fy = v_fy
  returning last_no into v_next;

  return p_prefix || '-' || split_part(v_fy, '-', 1) || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Seed the invoice counter from whatever numbers already exist, so the
-- sequence continues rather than restarting at 1.
--
-- Only the trailing digits count. Stripping every non-digit from
-- "INV-2026-007" would give 2026007, and the next invoice would be
-- numbered INV-2026-2026008.
insert into doc_counters (doc_type, fy, last_no)
select 'invoice', fy_of(),
       coalesce(max(((regexp_match(invoice_no, '(\d+)\s*$'))[1])::integer), 0)
  from invoices
 where invoice_no ~ '\d+\s*$'
on conflict (doc_type, fy) do nothing;

create or replace function set_order_no()
returns trigger
language plpgsql
as $$
begin
  if new.order_no is null or new.order_no = '' then
    new.order_no := next_doc_no('order', 'ORD');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_no on orders;
create trigger orders_set_no before insert on orders
  for each row execute function set_order_no();


-- Keep updated_at honest.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_touch on orders;
create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();

drop trigger if exists enquiries_touch on enquiries;
create trigger enquiries_touch before update on enquiries
  for each row execute function touch_updated_at();


-- ------------------------------------------------------------
-- 5. The salesperson role
--
-- profiles.role currently allows only 'admin' and 'supervisor', so the
-- check constraint has to be replaced before a third role can exist.
-- ------------------------------------------------------------

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin','supervisor','salesperson'));

create or replace function my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(my_role() = 'admin', false);
$$;


-- ------------------------------------------------------------
-- 6. Row Level Security
--
-- This is the part that actually restricts the salesperson.
--
-- Hiding tabs in the page only hides them. The browser holds a real
-- database key, so anyone who opens the developer console can query
-- every table the key is allowed to read — including inventory cost,
-- batch cost and supplier pricing. For a salesperson who may one day
-- work for a competitor, that is precisely the data you do not want
-- leaving with them. The rules below are enforced by Postgres, so the
-- console gets the same answer the page does.
--
-- IMPORTANT — read before editing:
--
-- schema.sql created a policy named "auth full access" on every table,
-- defined as USING (true). Postgres combines permissive policies with
-- OR, so leaving it in place means "true OR is_admin()", which is
-- always true — every restriction below would be silently cancelled
-- out while still reading correctly in the file. It has to be dropped
-- explicitly, per table, which is what the first block does.
--
-- Because that policy is being removed, every table it covered needs a
-- complete replacement here, or the people who legitimately use it will
-- be locked out.
--
-- The model:
--
--            admin        supervisor      salesperson
--  partners  all          read            read + add + edit
--  inventory all          read + write    none
--  batches   all          read + write    none
--  payments  all          none            none
--  invoices  all          read            read, own orders only
--  orders    all          read            own only
-- ------------------------------------------------------------

-- Remove the blanket-allow policy from every table it was created on.
do $$
declare t text;
begin
  foreach t in array array['partners','inventory','batches','invoices','invoice_items','payments'] loop
    execute format('drop policy if exists "auth full access" on %I', t);
  end loop;
end $$;

alter table enquiries   enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table doc_counters enable row level security;

-- --- Customers: a salesperson may add and edit customers. ---
drop policy if exists "partners readable" on partners;
create policy "partners readable" on partners
  for select to authenticated using (true);

drop policy if exists "partners writable by sales" on partners;
create policy "partners writable by sales" on partners
  for insert to authenticated
  with check (my_role() in ('admin','salesperson'));

drop policy if exists "partners updatable by sales" on partners;
create policy "partners updatable by sales" on partners
  for update to authenticated
  using (my_role() in ('admin','salesperson'));

-- Only an admin may delete a customer — a salesperson removing a
-- customer would take its order history with it.
drop policy if exists "partners deletable by admin" on partners;
create policy "partners deletable by admin" on partners
  for delete to authenticated using (is_admin());


-- --- Enquiries and orders: a salesperson sees their own. ---
drop policy if exists "enquiries visible" on enquiries;
create policy "enquiries visible" on enquiries
  for select to authenticated
  using (my_role() in ('admin','supervisor') or handled_by = auth.uid());

drop policy if exists "enquiries insertable" on enquiries;
create policy "enquiries insertable" on enquiries
  for insert to authenticated
  with check (my_role() in ('admin','salesperson'));

drop policy if exists "enquiries updatable" on enquiries;
create policy "enquiries updatable" on enquiries
  for update to authenticated
  using (is_admin() or handled_by = auth.uid());

drop policy if exists "orders visible" on orders;
create policy "orders visible" on orders
  for select to authenticated
  using (my_role() in ('admin','supervisor') or created_by = auth.uid());

drop policy if exists "orders insertable" on orders;
create policy "orders insertable" on orders
  for insert to authenticated
  with check (
    my_role() in ('admin','salesperson')
    and (created_by = auth.uid() or created_by is null)
  );

-- A salesperson may move their own order along — pending → delivered —
-- but only an admin may cancel one.
drop policy if exists "orders updatable" on orders;
create policy "orders updatable" on orders
  for update to authenticated
  using (is_admin() or created_by = auth.uid())
  with check (is_admin() or fulfilment_status <> 'cancelled');

drop policy if exists "order_items visible" on order_items;
create policy "order_items visible" on order_items
  for select to authenticated
  using (exists (
    select 1 from orders o where o.id = order_items.order_id
      and (my_role() in ('admin','supervisor') or o.created_by = auth.uid())
  ));

drop policy if exists "order_items writable" on order_items;
create policy "order_items writable" on order_items
  for all to authenticated
  using (exists (
    select 1 from orders o where o.id = order_items.order_id
      and (is_admin() or o.created_by = auth.uid())
  ))
  with check (exists (
    select 1 from orders o where o.id = order_items.order_id
      and (is_admin() or o.created_by = auth.uid())
  ));


-- --- Cost and margin data ---
-- A salesperson has no reason to read what a product costs to make.
-- Production staff do need it to record batches, so they keep access.
alter table inventory enable row level security;
alter table batches   enable row level security;
alter table payments  enable row level security;

drop policy if exists "inventory ops read" on inventory;
create policy "inventory ops read" on inventory
  for select to authenticated using (my_role() in ('admin','supervisor'));

drop policy if exists "inventory ops write" on inventory;
create policy "inventory ops write" on inventory
  for all to authenticated
  using (my_role() in ('admin','supervisor'))
  with check (my_role() in ('admin','supervisor'));

drop policy if exists "batches ops read" on batches;
create policy "batches ops read" on batches
  for select to authenticated using (my_role() in ('admin','supervisor'));

drop policy if exists "batches ops write" on batches;
create policy "batches ops write" on batches
  for all to authenticated
  using (my_role() in ('admin','supervisor'))
  with check (my_role() in ('admin','supervisor'));

-- Money received is admin-only.
drop policy if exists "payments admin only" on payments;
create policy "payments admin only" on payments
  for all to authenticated using (is_admin()) with check (is_admin());

-- Invoices: a salesperson may read the invoices for their own orders,
-- so they can answer "what does this restaurant still owe?" — but not
-- the whole book.
alter table invoices      enable row level security;
alter table invoice_items enable row level security;

drop policy if exists "invoices visible" on invoices;
create policy "invoices visible" on invoices
  for select to authenticated
  using (
    my_role() in ('admin','supervisor')
    or exists (select 1 from orders o where o.invoice_id = invoices.id and o.created_by = auth.uid())
  );

drop policy if exists "invoices writable by admin" on invoices;
create policy "invoices writable by admin" on invoices
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "invoice_items visible" on invoice_items;
create policy "invoice_items visible" on invoice_items
  for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_items.invoice_id));

drop policy if exists "invoice_items writable by admin" on invoice_items;
create policy "invoice_items writable by admin" on invoice_items
  for all to authenticated using (is_admin()) with check (is_admin());

-- Counters are read and written only through next_doc_no(), which is
-- security definer, so no direct access is needed.
drop policy if exists "counters no direct access" on doc_counters;
create policy "counters no direct access" on doc_counters
  for all to authenticated using (false) with check (false);


-- ------------------------------------------------------------
-- 7. Reporting view — today's deliveries
--
-- What the salesperson opens in the morning: who wants what, when, and
-- whether it has gone out yet. Ordered by the time the customer asked
-- for, so the earliest slot is at the top.
-- ------------------------------------------------------------

create or replace view delivery_run as
select
  o.id,
  o.order_no,
  p.name              as customer,
  p.customer_type,
  p.area,
  coalesce(o.delivery_address, p.delivery_address) as address,
  coalesce(p.contact_phone, p.phone)               as phone,
  o.requested_for,
  o.requested_slot,
  o.fulfilment_status,
  o.created_by,
  (select coalesce(sum(oi.taxable_value), 0) from order_items oi where oi.order_id = o.id) as order_value
from orders o
join partners p on p.id = o.partner_id
where o.fulfilment_status in ('pending','packed','dispatched')
order by o.requested_for nulls last, o.created_at;


-- ------------------------------------------------------------
-- After running this, create the salesperson login in
-- Supabase → Authentication → Users, then run:
--
--   update profiles set role = 'salesperson' where email = '<their email>';
-- ------------------------------------------------------------
