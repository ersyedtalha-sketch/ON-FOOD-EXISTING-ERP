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
