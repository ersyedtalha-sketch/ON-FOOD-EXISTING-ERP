-- ============================================================
-- ON FOOD ERP — Step 3: Raise the invoice when the order is delivered
--
-- Run this ONCE in Supabase → SQL Editor, after 02-orders-and-sales.sql.
--
-- One tax invoice per delivery. The moment an order is marked
-- 'delivered', its invoice is raised from the order lines, numbered,
-- dated, and queued to be sent to the customer.
--
-- Why at delivery rather than at order time: for a supply of goods, GST
-- requires the tax invoice to be issued before or at the time the goods
-- are delivered. Invoicing at delivery satisfies that with no extra
-- paperwork. (Invoicing monthly instead would be allowed, but then every
-- shipment needs its own delivery challan to travel against — more to
-- build and more for the salesman to carry.)
-- ============================================================


-- ------------------------------------------------------------
-- 1. Your own business details
--
-- The invoice needs to know which state you supply FROM, because that is
-- what decides CGST+SGST (same state) versus IGST (different state).
-- Held in a table rather than hard-coded so it can be corrected without
-- a code change.
-- ------------------------------------------------------------

create table if not exists app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('home_state',   'Karnataka'),
  ('legal_name',   'ON FOOD'),
  ('gstin',        ''),
  ('fssai',        ''),
  ('invoice_terms','Payment due as per agreed credit terms.')
on conflict (key) do nothing;

create or replace function setting(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from app_settings where key = p_key;
$$;

alter table app_settings enable row level security;

drop policy if exists "settings readable" on app_settings;
create policy "settings readable" on app_settings
  for select to authenticated using (true);

drop policy if exists "settings writable by admin" on app_settings;
create policy "settings writable by admin" on app_settings
  for all to authenticated using (is_admin()) with check (is_admin());


-- ------------------------------------------------------------
-- 2. Outbound message queue
--
-- "They must get an invoice on their mobile number."
--
-- The database cannot call WhatsApp itself, and it should not try — an
-- HTTP call inside a transaction means a slow API can hold a database
-- lock open. Instead the invoice is queued here, and the Edge Function
-- drains the queue and does the sending.
--
-- The queue is also what makes delivery reliable: if WhatsApp is down or
-- the number is wrong, the row stays with status 'failed' and a reason,
-- instead of the invoice silently never arriving.
-- ------------------------------------------------------------

create table if not exists outbox (
  id            uuid primary key default gen_random_uuid(),
  channel       text not null default 'whatsapp'
                  check (channel in ('whatsapp','sms','email')),
  to_address    text not null,              -- phone in E.164, e.g. +919876543210
  purpose       text not null
                  check (purpose in ('invoice','order_confirmation','payment_link','campaign','other')),
  invoice_id    uuid references invoices(id) on delete set null,
  order_id      uuid references orders(id) on delete set null,
  partner_id    uuid references partners(id) on delete set null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'queued'
                  check (status in ('queued','sending','sent','failed','cancelled')),
  attempts      integer not null default 0,
  last_error    text,
  provider_ref  text,                       -- WhatsApp message id once accepted
  queued_at     timestamptz not null default now(),
  sent_at       timestamptz
);

create index if not exists outbox_pending_idx on outbox (status, queued_at)
  where status in ('queued','failed');
create index if not exists outbox_invoice_idx on outbox (invoice_id);

alter table outbox enable row level security;

drop policy if exists "outbox visible" on outbox;
create policy "outbox visible" on outbox
  for select to authenticated
  using (
    my_role() in ('admin','supervisor')
    or exists (select 1 from orders o where o.id = outbox.order_id and o.created_by = auth.uid())
  );

drop policy if exists "outbox writable by admin" on outbox;
create policy "outbox writable by admin" on outbox
  for all to authenticated using (is_admin()) with check (is_admin());


-- ------------------------------------------------------------
-- 3. Phone numbers in the form WhatsApp accepts
--
-- WhatsApp needs E.164 (+91XXXXXXXXXX). People type numbers with
-- spaces, hyphens and a leading 0. A number that fails to normalise
-- returns null, and the caller records that rather than sending into
-- the void.
-- ------------------------------------------------------------

create or replace function to_e164(p_phone text, p_default_cc text default '91')
returns text
language plpgsql
immutable
as $$
declare d text;
begin
  if p_phone is null then return null; end if;

  d := regexp_replace(p_phone, '\D', '', 'g');
  d := regexp_replace(d, '^0+', '');           -- drop STD prefix zeros

  if length(d) = 10 then                        -- plain Indian mobile
    return '+' || p_default_cc || d;
  elsif length(d) between 11 and 15 then        -- already carries a country code
    return '+' || d;
  else
    return null;                                -- not usable
  end if;
end;
$$;


-- ------------------------------------------------------------
-- 4. Raise the invoice for one order
--
-- SECURITY DEFINER so a salesperson can trigger it by marking their own
-- order delivered, without being granted write access to the invoice
-- book generally.
--
-- Returns the invoice id. Calling it twice returns the same invoice
-- rather than raising a second one — which matters, because a webhook
-- retry or a double tap on a phone would otherwise invoice the customer
-- twice for one delivery.
-- ------------------------------------------------------------

create or replace function invoice_for_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order      orders%rowtype;
  v_partner    partners%rowtype;
  v_invoice_id uuid;
  v_invoice_no text;
  v_tax_type   text;
  v_taxable    numeric := 0;
  v_cgst       numeric := 0;
  v_sgst       numeric := 0;
  v_igst       numeric := 0;
  v_items      integer;
  v_phone      text;
begin
  -- Lock the order so two simultaneous "delivered" taps queue up here
  -- and the second one sees the invoice the first one created.
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_order.invoice_id is not null then
    return v_order.invoice_id;                  -- already invoiced
  end if;

  select count(*) into v_items from order_items where order_id = p_order_id;
  if v_items = 0 then
    raise exception 'Order % has no items, so it cannot be invoiced', v_order.order_no
      using hint = 'Add at least one product to the order before marking it delivered.';
  end if;

  select * into v_partner from partners where id = v_order.partner_id;
  if not found then
    raise exception 'Order % has no customer', v_order.order_no;
  end if;

  -- Same state as us -> CGST + SGST. Different state -> IGST.
  v_tax_type := case
    when coalesce(v_partner.state, setting('home_state')) = setting('home_state')
      then 'intra-state' else 'inter-state'
  end;

  -- Totals, computed per line because GST rate can differ by product.
  select
    coalesce(sum(round(pcs_per_pack * quantity * rate_per_piece, 2)), 0),
    coalesce(sum(round(pcs_per_pack * quantity * rate_per_piece * gst_rate / 100.0, 2)), 0)
  into v_taxable, v_igst
  from order_items where order_id = p_order_id;

  if v_tax_type = 'intra-state' then
    v_cgst := round(v_igst / 2, 2);
    v_sgst := v_igst - v_cgst;                  -- keeps CGST+SGST exact after rounding
    v_igst := 0;
  end if;

  v_invoice_no := next_doc_no('invoice', 'INV');

  insert into invoices (
    invoice_no, partner_id, issue_date, due_date, tax_type,
    taxable_value, cgst, sgst, igst, grand_total, paid_amount, status
  ) values (
    v_invoice_no, v_partner.id, current_date,
    current_date + make_interval(days => coalesce(v_partner.credit_days, 0)),
    v_tax_type,
    v_taxable, v_cgst, v_sgst, v_igst,
    round(v_taxable + v_cgst + v_sgst + v_igst, 2), 0, 'pending'
  )
  returning id into v_invoice_id;

  insert into invoice_items (
    invoice_id, product_name, hsn, pcs_per_pack, quantity,
    rate_per_piece, taxable_value, gst_rate
  )
  select
    v_invoice_id, product_name, hsn, pcs_per_pack, quantity,
    rate_per_piece, round(pcs_per_pack * quantity * rate_per_piece, 2), gst_rate
  from order_items where order_id = p_order_id;

  update orders set invoice_id = v_invoice_id where id = p_order_id;

  -- Queue it for the customer's mobile.
  v_phone := to_e164(coalesce(v_partner.contact_phone, v_partner.phone));
  insert into outbox (channel, to_address, purpose, invoice_id, order_id, partner_id, payload, status, last_error)
  values (
    'whatsapp',
    coalesce(v_phone, 'unknown'),
    'invoice',
    v_invoice_id, p_order_id, v_partner.id,
    jsonb_build_object(
      'invoice_no',  v_invoice_no,
      'customer',    v_partner.name,
      'grand_total', round(v_taxable + v_cgst + v_sgst + v_igst, 2),
      'due_date',    current_date + make_interval(days => coalesce(v_partner.credit_days, 0))
    ),
    case when v_phone is null then 'failed' else 'queued' end,
    case when v_phone is null
         then 'No usable mobile number on this customer' else null end
  );

  return v_invoice_id;
end;
$$;


-- ------------------------------------------------------------
-- 5. Fire it when the salesman marks the order delivered
-- ------------------------------------------------------------

create or replace function orders_invoice_on_delivery()
returns trigger
language plpgsql
as $$
begin
  if new.fulfilment_status = 'delivered'
     and coalesce(old.fulfilment_status, '') <> 'delivered'
     and new.invoice_id is null then
    perform invoice_for_order(new.id);
    -- invoice_for_order set orders.invoice_id on the stored row; reflect
    -- it here so the value this trigger returns is not stale.
    select invoice_id into new.invoice_id from orders where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_invoice_trg on orders;
create trigger orders_invoice_trg
  after update of fulfilment_status on orders
  for each row execute function orders_invoice_on_delivery();


-- ------------------------------------------------------------
-- 6. Month-wise view for GST filing
--
-- The PDFs live in storage under invoices/YYYY-MM/. This is the matching
-- data: one row per invoice, with everything GSTR-1 asks for, and the
-- B2B / B2C split that decides how each one is reported. B2B invoices go
-- in individually; B2C small are reported as a summary.
-- ------------------------------------------------------------

create or replace view gst_register as
select
  to_char(i.issue_date, 'YYYY-MM')          as period,
  i.invoice_no,
  i.issue_date,
  p.name                                    as customer,
  p.gstin                                   as customer_gstin,
  coalesce(p.state, setting('home_state'))  as place_of_supply,
  case when p.gstin is not null and p.gstin <> '' then 'B2B' else 'B2C' end as supply_type,
  i.tax_type,
  i.taxable_value,
  i.cgst,
  i.sgst,
  i.igst,
  i.grand_total,
  i.status                                  as payment_status,
  o.order_no,
  o.delivered_at
from invoices i
left join partners p on p.id = i.partner_id
left join orders   o on o.invoice_id = i.id;
