-- ============================================================
-- START FRESH — clear all production & sales data
-- Wipes batches, inventory, invoices, invoice items, and payments
-- so you can re-enter from scratch.
-- KEEPS your partners (customers/suppliers like Shams Tabrez) and
-- your login users.
-- ============================================================
-- Paste into Supabase → SQL Editor → paste over the box → Run.
-- ⚠️ Permanently deletes all rows in these tables. No undo.
-- ============================================================

truncate table
  payments,
  invoice_items,
  invoices,
  batches,
  inventory
restart identity cascade;

-- Partners are untouched. If you ALSO want to remove partners,
-- uncomment the next line:
-- truncate table partners restart identity cascade;
