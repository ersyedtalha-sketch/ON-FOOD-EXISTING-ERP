# ON FOOD ERP — Development Plan

**Status:** Proposal / v1
**Scope:** Restaurant & cloud kitchen · Food manufacturing · Distribution & wholesale · Meal subscription & catering
**Scale target:** 1 location today → multi-city later, on one codebase
**Approach:** Custom build

---

## 1. The central idea

Four business lines were selected. The instinct is to build four systems. Don't.

Every one of those businesses is the same physical loop:

```
        BUY  ──────►  MAKE  ──────►  MOVE  ──────►  SELL
         │             │             │              │
         └─────────────┴─────────────┴──────────────┘
                          │
                  every step is a costed,
                  batch-tracked movement of
                  perishable stock
```

Restaurant, factory, warehouse and subscription kitchen differ only in *which* steps
they emphasise and *what the paperwork is called*. Underneath, they all move food that
has a batch number, an expiry date and a cost.

So the architecture is **one spine, four verticals**:

| Layer | What it is | Who uses it |
|---|---|---|
| **Spine** | Items, UoM, batches, expiry, stock ledger, costing, locations, GL, RBAC | Everything |
| Vertical A | Recipes → POS → Kitchen Display | Restaurant / cloud kitchen |
| Vertical B | BOM → Work Orders → Batch output → QC | Manufacturing |
| Vertical C | PO/SO → Picking → Dispatch → AR | Distribution / wholesale |
| Vertical D | Plans → Menu calendar → Delivery runs → Wallet | Subscription / catering |

Two economies fall out of this, and they are the reason the scope is achievable at all:

- **A recipe and a bill of materials are the same object.** A kitchen recipe is a BOM
  with a batch size of one portion. Build the BOM engine once; the restaurant and the
  factory both consume it.
- **A subscription order and a wholesale order are the same object.** One is triggered
  by a schedule, the other by a customer. Build the sales-order pipeline once; both
  feed it.

Build two primitives, get four verticals. That is the whole strategy.

---

## 2. What to build first, and why

The order below is not arbitrary. It follows **where a food business actually loses
money**: not in fancy reporting, but in shrinkage, spoilage and mis-costed portions.
Inventory and costing come first, always.

| Phase | Deliverable | Est. | Why here |
|---|---|---|---|
| **0** | Foundation — auth, RBAC, company/branch/warehouse tree, item master, UoM conversion, audit log, design system | 2–3 wks | Nothing can be built before locations and items exist |
| **1** | **Inventory spine** — batches, expiry, stock ledger, goods receipt, transfers, adjustments, stock take, costing | 4–6 wks | The heart. Wrong here = every downstream number is wrong |
| **2** | Procurement & payables — suppliers, PO, receipt matching, bills, payments | 4–6 wks | Closes the "BUY" loop and gives you real landed cost |
| **3** | Production — BOM/recipes, work orders, batch output, yield & wastage, QC | 4–6 wks | Serves kitchen **and** factory from one build |
| **4** | Sales & receivables — customers, SO, picking, dispatch, invoice, credit limits | 6–8 wks | Unlocks the distribution vertical |
| **5** | **POS + Kitchen Display (offline-first)** | 6–8 wks | Restaurant vertical; hardest engineering, see §5 |
| **6** | Subscriptions — plans, menu calendar, delivery runs, customer wallet | 4–6 wks | Rides on the Phase 4 sales pipeline |
| **7** | Finance close & BI — GL reports, period close, dashboards | ongoing | Meaningful only once 1–6 produce real data |

**Realistic total: 9–14 months** to all four verticals with a small team. I would rather
say that now than discover it in month four.

### Go live module by module

Do **not** big-bang. Each phase ends with real users on real data:

- After Phase 1 → the storekeeper stops using the stock notebook.
- After Phase 2 → purchasing runs in the system.
- After Phase 3 → you know your true food cost per dish for the first time.
- After Phase 5 → the outlet tills switch over.

Every phase must be independently valuable. If the project stalls at Phase 3, you
should still be meaningfully better off than you were before it started.

---

## 3. Recommended stack

| Layer | Choice | Reasoning |
|---|---|---|
| Database | **PostgreSQL** | Transactional integrity is non-negotiable for stock + money. Row-Level Security gives clean multi-branch isolation. Table partitioning handles a stock ledger that grows forever. |
| Backend | **TypeScript + NestJS** | Modular by design, which suits a spine-and-verticals layout. One language across server, web, POS and mobile. |
| ORM | **Drizzle** (or Prisma) | Explicit SQL when the costing queries get hairy — and they will. |
| Web client | **React + Vite + TanStack Query** | Standard, hireable, fast. |
| POS / KDS | **React + local SQLite, sync queue** | Must work with the internet down. See §5. |
| Mobile (delivery/van) | **React Native (Expo)** | Reuses the same TypeScript types and validation. |
| Auth | Session-based + RBAC in-app | ERP roles are too fine-grained for an off-the-shelf identity product alone. |

**Honest alternative:** Django + DRF. Its admin gives you free back-office CRUD for the
~50 master-data tables, which is a genuine multi-week head start on an ERP specifically.
Pick it if the team is stronger in Python. I recommend TypeScript because the POS,
kitchen display and delivery apps are all substantial frontends, and sharing types
between server and those clients removes a whole category of bug.

**Don't** use MongoDB or any non-transactional store for stock or ledger data. Not
negotiable.

---

## 4. Data model — the parts that matter

Most of an ERP schema is unremarkable. These five decisions are the ones that are
expensive to change later.

### 4.1 Location hierarchy — set it up on day one

```
Company ──► Branch ──► Warehouse ──► Bin/Zone
```

Even with a single site, model all four levels immediately and put `company_id` and
`branch_id` on **every** transactional table. Retrofitting multi-branch into a
single-site schema is a rewrite. Adding a second branch to this schema is a row.

Enforce isolation with Postgres Row-Level Security at the connection level, not with
`WHERE` clauses in application code — application filters get forgotten exactly once,
and that once is a data leak between branches.

**Single database, single schema, tenant columns.** Not schema-per-tenant, not
database-per-tenant. This carries you to multi-city comfortably and keeps
cross-branch reporting trivial.

### 4.2 The stock ledger is append-only

```
stock_ledger_entry
  id, company_id, branch_id, warehouse_id, bin_id
  item_id, batch_id
  qty_delta        NUMERIC(18,6)    -- signed: +receipt, -issue
  uom_id
  unit_cost        BIGINT           -- minor units
  value_delta      BIGINT           -- minor units, signed
  posting_at       TIMESTAMPTZ
  source_doc_type, source_doc_id    -- polymorphic link back to GRN/SO/WO...
  reversal_of_id   NULL | FK        -- corrections are entries, never edits
  created_by, created_at
```

Rules, enforced in code and by database constraint:

1. **Never `UPDATE`, never `DELETE`.** A mistake is corrected by posting a reversing
   entry. This is what makes the system auditable and what lets you answer "what did
   stock look like last Tuesday" — a question you will be asked.
2. **Current stock is derived**, not stored as a mutable column. Keep a materialised
   balance table for speed if needed, but the ledger is the truth and the balance must
   be rebuildable from it by a script you actually run in CI.
3. **Money as integers in minor units.** Never floats. `BIGINT` paise/cents.
4. **Quantities as `NUMERIC(18,6)`.** Never floats. 0.1 kg + 0.2 kg must equal 0.3 kg.
5. **One database transaction** wraps the stock movement and its GL posting. They
   commit together or not at all.

### 4.3 Batch, expiry and FEFO

This is the requirement that separates a food ERP from a generic one, and it must be in
the schema from the first migration:

- Every stock-tracked item is either batch-tracked or not — decided on the item master,
  never mixed after go-live.
- A batch carries `manufactured_at`, `expiry_at`, `supplier_batch_ref`, and its own
  cost.
- Picking defaults to **FEFO — First Expiry, First Out**, not FIFO. This trips people
  up constantly. The oldest stock is not always the stock that expires first.
- **Traceability must run both directions.** Forward: "batch B-4471 went to which
  customers?" (that is a product recall, and you will have hours, not days). Backward:
  "this finished batch was made from which raw batches?" Model it as a link table
  between consumed and produced batches on every work order.

### 4.4 UoM conversion with yield

Food is where unit conversion gets genuinely hard:

- You buy chicken in **kg**, store in **kg**, use in recipes in **g**, sell as a
  **portion**.
- You buy oil in **kg** but recipes call for **ml** — that needs density per item, not
  a global constant.
- **1 kg of raw chicken is not 1 kg of cooked chicken.** Every recipe line needs a
  yield percentage, and every recipe needs a wastage/trim allowance. A costing engine
  without yield will understate your food cost by 15–30% and quietly tell you that
  loss-making dishes are profitable.

### 4.5 Double-entry from day one

Every stock movement, every invoice, every payment posts to a general ledger with
balanced debits and credits. It is tempting to skip this early and "add accounting
later." Retrofitting double-entry onto a year of transactions is one of the most
painful things you can do to yourself. Build the posting engine in Phase 1 with three
accounts if that's all you need, and grow the chart of accounts from there.

---

## 5. The POS must work offline. Design for it now.

A till that stops taking orders when the internet drops is not usable in a restaurant.
This single requirement shapes the architecture, so it cannot be a Phase 5 discovery.

- POS holds a **local SQLite** copy of menu, prices and open orders, and writes sales
  locally first.
- A **sync queue** pushes to the server when connectivity returns.
- Every POS-originated document carries a **client-generated UUID and an idempotency
  key**, so a retried sync never double-posts a sale. Assume every sync will be
  retried, because it will.
- Decide the **negative-stock policy** explicitly: an offline till *will* sell the last
  portion twice across two terminals. Either allow negative stock and reconcile at
  day-close, or reserve stock per terminal. Allowing it and reconciling is usually
  right for restaurants — but it must be a decision, not an accident.
- **Shift close and day close** are first-class documents: cash counted vs. cash
  expected, variance recorded and approved by a named user.

---

## 6. Food-specific requirements people forget

Budget for these explicitly. Every one of them has sunk a food ERP that treated food
as generic inventory:

- **FEFO picking** rather than FIFO (§4.3).
- **Yield and wastage** on every recipe line (§4.4).
- **Wastage capture as a first-class transaction** — spoilage, trim, staff meals,
  customer complaints and returns are four different reasons with four different GL
  treatments. If wastage is just "stock adjustment," you will never find out where
  the money goes.
- **Shelf-life alerts** — near-expiry stock flagged before it becomes a write-off.
- **HACCP / temperature and hygiene logs** if you manufacture — likely a regulatory
  requirement, and much cheaper as a module than as a spreadsheet you have to
  reconstruct during an audit.
- **Portion-level costing** — menu engineering needs cost per portion, not cost per kg.
- **Recipe versioning** — when a recipe changes, historical costs must stay computed
  against the version that was actually in force.
- **Multi-price customers** — wholesale, retail and subscription prices for the same
  item, plus customer-specific price lists.
- **Credit limits and ageing** on wholesale customers, enforced at order entry, not
  discovered at month-end.
- **Gapless, per-branch document numbering** where tax law requires it.

---

## 7. Engineering rules to hold the line on

1. Stock ledger and GL are append-only. Corrections are reversing entries.
2. Stock movement and its accounting posting share one database transaction.
3. Money is integer minor units. Quantities are `NUMERIC`. Never floats.
4. Every transactional table carries `company_id` and `branch_id`, enforced by RLS.
5. Every mutation is attributable — user, timestamp, source document. ERP disputes are
   settled by audit trail.
6. Costing logic lives in **one** service. The moment two places compute cost, they
   disagree, and you will spend a week finding out which is right.
7. There is a script that rebuilds every stock balance from the ledger, and it runs in
   CI against seeded data. If balances and ledger can ever disagree silently, they
   eventually will.
8. Seed data and migrations are versioned from commit one.

---

## 8. Design system

The brand kit supplies a complete visual foundation. Tokens are checked in at
`brand/tokens.css` and `brand/tokens.json`.

| Token | Value | Use |
|---|---|---|
| Forest Green | `#1B4D2E` | Primary actions, navigation, headings |
| Leaf Green | `#7CB342` | Accents, success states, positive deltas |
| Off White | `#FAF9F5` | App background, surfaces |
| Warm Brown | `#5D3A1A` | Secondary, warm highlights |

**Typography:** EB Garamond 700 is a display face — use it for the wordmark and
marketing surfaces only. **Do not set ERP data in it.** Lato is the interface font;
dense operational tables need a neutral sans and tabular figures. Both are OFL-licensed
and self-hostable, so no external font CDN is required.

**A caution specific to this brand:** green means "good" in every dashboard ever built.
Since Forest Green is the primary brand colour, semantic green (success) and brand
green must be visually distinct, or an operator cannot tell a branded panel from a
passing check at a glance. Reserve Leaf Green `#7CB342` for semantic success and keep
Forest Green `#1B4D2E` for chrome and navigation. Define amber and red semantic tokens
that sit outside the brand palette entirely.

Practical notes: `onfood-leaf-mark.svg` is pure vector with no embedded font — use it
for the collapsed sidebar, the favicon and the POS splash. The reversed lockups are for
the dark-background kitchen display, which is typically viewed from two metres away and
should be high-contrast and large-type.

---

## 9. Immediate next steps

1. **Confirm the phase order** in §2, especially that inventory precedes everything.
2. **Write down the current process** for one thing — receiving a delivery — exactly as
   it happens today, including the parts done on paper and in someone's head. Build
   Phase 1 against that, not against a generic ERP flow.
3. **Scaffold Phase 0**: repo structure, Postgres, migrations, auth, RBAC, the
   company/branch/warehouse tree and the item master.
4. **Pin the four decisions that are expensive to reverse** before writing feature code:
   costing method (moving average vs. FIFO-by-batch), negative stock policy, batch
   tracking scope, and the fiscal calendar.

---

## 10. Two risks worth naming now

**Scope.** All four verticals at once is a lot. The spine-and-verticals design is what
makes it tractable, but if timelines compress, the correct move is to ship fewer
verticals fully rather than all four half-built. A half-built inventory module is worse
than the notebook it replaced, because people trust it.

**The "existing" in the repo name.** This repository is empty, so this plan assumes a
greenfield build. If an ERP or any operational system is already running somewhere —
even spreadsheets — then data migration and a cutover plan need to be added to Phase 1,
and that is typically weeks of work, not days. Historical stock balances and open
customer balances are the hard part.
