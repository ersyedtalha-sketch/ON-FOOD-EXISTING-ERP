-- ============================================================
-- CLEAR ALL TEST DATA
-- Run this AFTER testing to wipe every entry and start clean.
-- It empties the tables but KEEPS them (and your login users).
-- ============================================================
-- Paste into Supabase → SQL Editor → paste over the box → Run.
-- ⚠️ This permanently deletes all rows in these tables. No undo.
-- ============================================================

truncate table
  payments,
  invoice_items,
  invoices,
  batches,
  inventory,
  partners
restart identity cascade;

-- Your tables, permissions, and login users are untouched —
-- only the data rows are removed.
