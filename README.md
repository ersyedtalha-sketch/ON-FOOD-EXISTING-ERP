<img src="brand/logo/onfood-logo-horizontal.svg" alt="ON FOOD" width="280">

# ON FOOD ERP

Enterprise resource planning for a vertically integrated food business — production,
kitchens, distribution and subscriptions on one system.

## Status

**Planning.** No application code yet. This repository currently holds the development
plan and the brand foundation.

## Scope

| Vertical | Covers |
|---|---|
| Restaurant / cloud kitchen | POS, kitchen display, recipe costing, outlet stock |
| Food manufacturing | BOM, work orders, batch output, yield, QC |
| Distribution / wholesale | Purchase & sales orders, dispatch, receivables |
| Subscription / catering | Meal plans, menu calendar, delivery runs, wallets |

All four are served by a single shared core — items, batches, expiry, stock ledger,
costing and general ledger. See the plan for why that matters.

## Contents

| Path | What |
|---|---|
| [`docs/ERP-DEVELOPMENT-PLAN.md`](docs/ERP-DEVELOPMENT-PLAN.md) | Architecture, data model, phased roadmap |
| `brand/logo/` | Logo files — SVG (font embedded) and 4× PNG |
| `brand/tokens.css` | Design tokens as CSS custom properties |
| `brand/tokens.json` | The same tokens for build tooling |

## Brand

| | Hex | Use |
|---|---|---|
| Forest Green | `#1B4D2E` | Primary, navigation, headings |
| Leaf Green | `#7CB342` | Accent, success states |
| Off White | `#FAF9F5` | Background, surfaces |
| Warm Brown | `#5D3A1A` | Secondary |

Typefaces: **EB Garamond** 700 (wordmark and marketing only) and **Lato** (all
interface text). Both SIL OFL 1.1 and self-hostable. Full usage rules — clear space,
minimum sizes, which lockup goes where — are in [`brand/logo/README.txt`](brand/logo/README.txt).

## Next step

Scaffold Phase 0 — Postgres, migrations, auth, RBAC, the company/branch/warehouse tree
and the item master. See §9 of the development plan.
