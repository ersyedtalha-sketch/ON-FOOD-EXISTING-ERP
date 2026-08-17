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

---

## Running the app

The source in `app/` still opens directly — `ERP Preview.html` in a
browser, no build needed, exactly as before.

For anything a real user touches, build it first:

```bash
npm install
npm run build      # writes app/dist
npx serve app/dist
```

### Why

Loaded straight from source, the page fetches a 3 MB compiler and
compiles ~4,800 lines of JSX in the browser **on every page load**, from
six external hosts. If any of them is slow or blocked, the page is blank
— not slow, blank.

The build compiles once and bundles everything locally. Measured
like-for-like, both served from localhost with the same data:

| | Source | Built |
|---|---|---|
| Time to render | 2,564 ms | **196 ms** |
| Requests | 15 | 11 |
| Transferred | 5.17 MB | **0.44 MB** |

The spreadsheet library is 861 KB and nothing touches it until somebody
exports a report, so it is fetched on first use rather than on every page
load. That accounts for most of the difference in transfer size. Exporting
behaves exactly as it did before.

Nothing in `app/` is modified by the build, and no application code
changed to achieve this — same JSX, same screens, same logic.

### Deploying

Build command `npm run build`, publish directory `app/dist`. The built
folder is self-contained: no CDN, no external fonts, nothing to reach
except your own Supabase project.

`app/dist` is not committed — it is generated.
