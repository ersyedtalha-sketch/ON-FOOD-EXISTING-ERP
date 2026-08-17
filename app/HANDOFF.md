# ON Food ERP — Handoff for Claude Code

Working prototype of a production + sales ERP for ON Food (Kalaburagi, Karnataka).
Front end is plain HTML + React (via Babel, no build step). Backend is Supabase.

---

## Run it

Serve the folder over HTTP and open `ERP Preview.html`:

```bash
python3 -m http.server 8000
# open http://localhost:8000/ERP%20Preview.html
```

Opening the file directly with `file://` also works, but HTTP is safer for
the Supabase client.

---

## Files

| File | What it is |
|---|---|
| `ERP Preview.html` | **Entry point.** Loads React/Babel/Supabase/SheetJS, holds the auth gate, login screen, router, and role-based route guard. |
| `styles.css` | All styling. `.cur-*` = the original v0 look (design-review only). `.pro-*` = the live admin UI. `.pro-modal*`, `.pro-table`, `.pro-statgrid` etc. |
| `icons.jsx` | `window.Icons` — small inline SVG icon set. |
| `proposed-store.jsx` | **State + persistence.** `AppStateProvider` / `useAppState()`. Supabase row↔object mappers, `loadAll()`, `recomputeProducts()`, all actions. Falls back to in-memory when no Supabase client. |
| `proposed.jsx` | Sidebar, page header, stat/pill/Money primitives, and the Dashboard, Batches, Sales, Partners, Credit Ledger screens + New/Edit Batch dialog + Record Payment dialog. |
| `proposed-inventory.jsx` | Inventory screen + Add raw material dialog. |
| `proposed-costs.jsx` | Products screen (finished goods; produced − sold). |
| `proposed-invoice.jsx` | New Invoice screen: GST maths, stock/price guards, DB save, printable tax invoice, WhatsApp text, markdown + JSON payloads. |
| `proposed-export.jsx` | `window.ERPExport` — Excel export (per-section + full multi-tab report) via SheetJS. |
| `ERP Guide.html` | Printable team guide (ON Food brand styling) explaining every screen. |
| `ERP Review.html` + `current.jsx`, `critiques.jsx`, `design-canvas.jsx` | The original design review (current vs proposed). Not part of the app. |
| `backend/*.sql` | Schema and maintenance scripts (below). |

Script load order is defined in `ERP Preview.html` and matters:
`icons → store → proposed → invoice → costs → inventory → export`.

---

## Backend (Supabase)

Project URL and anon key are inlined in `ERP Preview.html` (search `SUPABASE_URL`).

Run order for a fresh project:

1. `backend/schema.sql` — creates `partners`, `inventory`, `batches`, `invoices`, `invoice_items`, `payments`.
2. `backend/allow-anon-temporary.sql` — **temporary** open RLS so the anon key can read/write.
3. `backend/profiles-and-roles.sql` — `profiles` table, signup trigger, `admin` / `supervisor` roles.
4. Make yourself an admin: `update profiles set role = 'admin' where email = '<you>';`
5. `backend/lock-down-rls.sql` — **replaces step 2.** Removes anon access and enforces
   the roles in the database. Run this before any real business data goes in.

Maintenance:

- `backend/start-fresh.sql` — wipes inventory/batches/invoices/items/payments, keeps partners + users.
- `backend/clear-test-data.sql` — wipes everything including partners.

### Security debt (important)

`allow-anon-temporary.sql` grants the `anon` role full access to every table, so
anyone holding the public anon key can read *and write* partners, invoices and
payments. Until it is removed, role separation exists **only in the UI** (route
guard in `ERP Preview.html`, nav filtering in `ProSidebar`).

**Fix: run `backend/lock-down-rls.sql`.** It drops the anon policies, revokes
anon's table grants, and adds role-scoped policies:

| Tables | admin | supervisor |
|---|---|---|
| `inventory`, `batches` | full | full |
| `partners`, `invoices`, `invoice_items`, `payments` | full | **no access** |
| `profiles` | read all, change any role | read all, edit own row, cannot change own role |

Two things that make this less obvious than it looks:

- `schema.sql` creates a policy called **`auth full access`** (`using (true)` for
  every logged-in user). Postgres policies are *permissive* — they OR together —
  so leaving it in place silently overrides the admin-only rules and a supervisor
  still reads every invoice. `lock-down-rls.sql` drops it. Don't re-add it.
- The script refuses to run until at least one `admin` exists, so you cannot lock
  yourself out of your own commercial tables.

Verified against a local Postgres 16 with a Supabase-shaped `auth.uid()` shim:
anon is refused outright; a supervisor sees 0 rows in partners/invoices/payments
but full access to inventory/batches; a supervisor cannot promote themselves or
demote an admin; an admin retains full access.

**Still outstanding after that:** the anon key is hardcoded in `ERP Preview.html`.
If this repo is ever public, rotate the key and move it to a gitignored config
file — RLS limits the damage but the key should not be in version control.

## Data model &amp; the core flow

```
inventory (raw material, stock_remaining)
    │  consumed by
    ▼
batches (consumed_qty, yield_per_unit, output_units, cost_per_unit)
    │  aggregated by recomputeProducts()
    ▼
products  (derived — NOT a table; lives in state.recipes)
    │  sold via
    ▼
invoice_items ──▶ invoices ──▶ payments
```

Key derivations, all in code (no DB triggers):

- **Raw stock left** = `inventory.qty − Σ(non-cancelled batches consuming it)` — computed in `loadAll()` (`proposed-store.jsx`).
- **Products** = `recomputeProducts(batches, prevRecipes)` in `proposed-store.jsx`. Keyed by `batch.product_name`. There is no `products` table by design — a product exists because a batch made it.
- **Finished stock** = `producedUnits − soldPieces`, where `soldPieces = Σ(invoice_items.quantity × pcs_per_pack)`. Computed in `proposed-costs.jsx` and again in `proposed-invoice.jsx` (`availableOf`).
- **Invoice status** — `paid` / `partial` / `pending`, plus `overdue` derived at render time when `due_date < today && balance > 0`.

### Gotcha: product-name matching

`invoice_items.product_name` historically stored `"Juwar Roti (pack)"`.
Both `proposed-costs.jsx` and `proposed-invoice.jsx` strip a trailing
parenthetical before matching. New invoices save the clean name
(`it.product_name`), with the decorated string kept only in `description`
for the printed bill. Keep both paths if you touch this.

---

## Business rules already enforced

- Cannot create a batch consuming more raw material than is in stock (edit mode credits back the batch's own prior consumption).
- Editing/deleting a batch returns raw material and recomputes products.
- Cannot sell more units than are in stock; multiple lines of the same product are summed. `Issue` button disables.
- Cannot issue a ₹0 invoice or a line without a rate.
- GST: intra-Karnataka → CGST+SGST split; other states → IGST. Rate per product (5% for current SKUs). Seller GSTIN `29AHRPT2032P1ZI`.
- Invoice numbers `INV-<year>-NNN`, next number derived from `max()` in the DB.
- Payments can be partial; invoice status and the credit ledger update from the sum of payments.

---

## Known gaps / good next tasks

1. **Lock down RLS** (see security debt above).
2. **Deploy** — the app is a static folder; any static host works once the Supabase keys are set. There is currently no permanent URL.
3. **Batch-level traceability** — stock is pooled per product. FIFO/expiry per batch is not modelled.
4. **Dashboard trend deltas** are placeholders in a few spots; margin/profit needs real cost-vs-price reporting.
5. **Sales/profit in the Excel Summary tab** — currently notes that invoice-derived totals are pending fuller wiring.
6. **No tests, no build step.** Migrating to Vite + real modules would remove the Babel-in-browser cost.
7. **WhatsApp send** is a `wa.me` deep link (manual send), not an API integration.

---

## Conventions

- Each `<script type="text/babel">` file has its own scope — shared components are published with `Object.assign(window, {...})` at the bottom. Keep that pattern or convert everything to modules at once.
- Styling is a single global `styles.css` with `.pro-` prefixes. No Tailwind.
- Currency renders through `<Money>`; always use tabular numerals (`.tnum`) for figures.
