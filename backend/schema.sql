-- ============================================================
-- ON Food ERP — Database schema (Step 1)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It creates the tables that match the prototype, with sensible
-- defaults and security turned on (only logged-in users can read/write).
-- ============================================================

-- ---------- PARTNERS (suppliers, grinders, customers, wholesalers) ----------
create table if not exists partners (
  id            uuid primary key default gen_random_uuid(),
  role          text not null check (role in ('Supplier','Grinder','Customer','Wholesaler')),
  name          text not null,
  sub           text,                 -- short label, e.g. "Juwar grain" / "Primary mill"
  phone         text,
  location      text,
  gstin         text,                 -- for customers/wholesalers you invoice
  state         text default 'Karnataka',
  created_at    timestamptz default now()
);

-- ---------- INVENTORY (raw materials in stock) ----------
create table if not exists inventory (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,        -- e.g. "Juwar Grain"
  vendor          text,                 -- supplier name (free text or copied from partner)
  vendor_id       uuid references partners(id) on delete set null,
  qty             numeric not null default 0,   -- quantity purchased
  unit            text not null default 'kg',
  cost_per_unit   numeric not null default 0,   -- ₹ per unit
  ship_per_unit   numeric not null default 0,   -- ₹ shipping per unit
  stock_remaining numeric not null default 0,   -- decreases as batches consume
  purchase_month  text,                 -- "2026-05"
  created_at      timestamptz default now()
);

-- ---------- BATCHES (production runs: raw material -> finished product) ----------
create table if not exists batches (
  id              uuid primary key default gen_random_uuid(),
  batch_no        text not null unique,         -- manual, e.g. "B-019"
  product_name    text not null,                -- what was made, e.g. "Juwar Roti"
  output_units    numeric not null default 0,   -- TOTAL products made (e.g. 1250)
  output_unit     text default 'products',      -- "chapatis" / "packs" / "pcs"
  consumed_name   text,                         -- raw material used
  consumed_qty    numeric not null default 0,   -- how much raw consumed
  consumed_unit   text default 'kg',
  inventory_id    uuid references inventory(id) on delete set null,
  yield_per_unit  numeric default 0,            -- products per 1 unit of raw
  flour_per_unit  numeric default 0,            -- grinding/transport ₹ per unit
  misc_cost       numeric default 0,            -- flat ₹ for the batch
  cost_per_unit   numeric default 0,            -- computed cost per product
  batch_cost      numeric default 0,            -- total batch cost
  status          text default 'progress' check (status in ('pending','progress','paid','cancelled')),
  notes           text,
  produced_on     date default current_date,
  created_at      timestamptz default now()
);

-- ---------- INVOICES (sales) ----------
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_no      text not null unique,         -- "INV-2026-007"
  partner_id      uuid references partners(id) on delete set null,
  issue_date      date default current_date,
  due_date        date,
  tax_type        text check (tax_type in ('intra-state','inter-state')),
  taxable_value   numeric default 0,
  cgst            numeric default 0,
  sgst            numeric default 0,
  igst            numeric default 0,
  grand_total     numeric default 0,
  paid_amount     numeric default 0,
  status          text default 'pending' check (status in ('pending','partial','paid','overdue','cancelled')),
  created_at      timestamptz default now()
);

-- ---------- INVOICE LINE ITEMS ----------
create table if not exists invoice_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid references invoices(id) on delete cascade,
  product_name    text not null,
  hsn             text,
  pcs_per_pack    numeric default 1,
  quantity        numeric not null default 0,   -- number of packs
  rate_per_piece  numeric not null default 0,
  taxable_value   numeric default 0,            -- pcs_per_pack * quantity * rate
  gst_rate        numeric default 5,
  created_at      timestamptz default now()
);

-- ---------- PAYMENTS (money collected against invoices) ----------
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid references invoices(id) on delete cascade,
  partner_id      uuid references partners(id) on delete set null,
  amount          numeric not null default 0,
  method          text,                         -- cash / UPI / bank
  receipt_no      text,
  paid_on         date default current_date,
  created_at      timestamptz default now()
);

-- ============================================================
-- SECURITY: turn on Row Level Security, allow only logged-in users.
-- (Simple to start; we can make it stricter per-role later.)
-- ============================================================
alter table partners       enable row level security;
alter table inventory      enable row level security;
alter table batches        enable row level security;
alter table invoices       enable row level security;
alter table invoice_items  enable row level security;
alter table payments       enable row level security;

-- Allow any authenticated (logged-in) user full access.
do $$
declare t text;
begin
  foreach t in array array['partners','inventory','batches','invoices','invoice_items','payments']
  loop
    execute format(
      'create policy "auth full access" on %I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- ---------- (Optional) turn on realtime so screens update live ----------
-- In the dashboard: Database → Replication → enable these tables.
-- Or run:
-- alter publication supabase_realtime add table partners, inventory, batches, invoices, invoice_items, payments;
