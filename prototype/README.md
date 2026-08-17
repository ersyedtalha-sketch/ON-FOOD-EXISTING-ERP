# ON FOOD ERP — clickable prototype

`onfood-erp-demo.html` is a single self-contained file. Open it in any browser —
no server, no build step, no network access required. Fonts are embedded.

## What is actually real in it

The prototype is not a set of mockups. The core mechanics from
[`../docs/ERP-DEVELOPMENT-PLAN.md`](../docs/ERP-DEVELOPMENT-PLAN.md) are implemented:

| Plan section | Implemented as |
|---|---|
| §4.2 Append-only stock ledger | Every balance on screen is summed from ledger rows on each render. Nothing is stored as a mutable total. |
| §4.2 Corrections are reversing entries | "Reverse" posts contra rows; original rows are never touched. |
| §4.3 FEFO, not FIFO | Picking sorts by expiry date. Expired batches are excluded from picking, not merely flagged. |
| §4.3 Batch traceability | A work order records which raw batches produced each finished batch. |
| §4.4 Yield | Recipes carry a yield % per line; a "naive cost" column shows what ignoring it would report. |
| §4.5 Double-entry | Every movement posts a balanced journal; the trial balance is shown live. |
| §5 Offline-first POS | Toggle the network off — the till keeps selling and queues documents. Replaying a synced document is rejected on its idempotency key. |
| §6 Wastage | Expired stock is written off to a wastage account, not buried in "stock adjustment". |

## Deliberate simplifications

- One branch is seeded. `company_id` / `branch_id` scoping is described in the plan
  but not exercised here.
- Quantities use JS numbers rounded to 6 dp. Production must use `NUMERIC(18,6)`.
- Money is held in integer minor units, as the plan requires.
- State lives in memory and resets on reload. There is no server; the "sync" panel
  simulates one to demonstrate the offline contract.

## Regenerating

The demo is built from a template plus base64-embedded fonts. The committed file is
the build output and can be edited directly.

---

# salesperson.html — field sales app

Open it in a browser. The three screens your salesman uses, sized for a
phone because he'll be standing in someone's kitchen, not at a desk.

**Today's run** — open orders sorted by the delivery window the customer
asked for. Tap *Mark delivered* to raise the invoice: the number, the tax
split and the mobile it went to appear immediately. Delivering the same
order twice returns the same invoice.

**New order** — pick a customer, add products, set when they want it. GST
recalculates live, and a customer outside Karnataka shows an IGST notice
before the order is placed rather than surprising you on the invoice.

**Customers** — add restaurants, hotels and stores. GSTIN and mobile are
validated on the spot; a bad GSTIN means the customer cannot claim input
tax credit, and a bad mobile means the invoice never arrives.

## What is deliberately absent

No cost, no margin, no supplier pricing, no payment records. This mirrors
the row-level security in `backend/02-orders-and-sales.sql` — a salesperson
login cannot read those tables at all, so the screens don't pretend to.

## Wiring it to the real database

All demo state sits in one block at the top of the `<script>`: `products`,
`customers`, `orders`. Every field matches a real column. Replacing that
block with Supabase queries is the whole job.

Two functions intentionally duplicate database logic so the screen can
show totals before anything is saved — `totals()` mirrors
`invoice_for_order()`, and `e164()` mirrors `to_e164()`. If you change the
rounding rule in one, change it in the other.

**Delivery windows** live in the `SLOTS` array, which fills the dropdown
*and* orders the run. Sorted as plain text, "4-6 PM" comes before
"6-8 AM" and the route reads backwards, so the order of that array is the
order of the day.
