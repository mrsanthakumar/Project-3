# Phase 14 — Frontend UI · Slice 2 (Executive Dashboard)

The Principal/Executive dashboard (Module 18 UI), wired to
`GET /dashboard/executive`. Verified with `tsc --noEmit` (clean).

## What was built
| File | Role |
|---|---|
| `src/lib/client/useApi.ts` | generic GET hook: loading/error/reload, unmount-safe |
| `src/components/charts/index.tsx` | Chart.js registration + `BarChart`, `LineChart`, `PieChart`, `FunnelChart` |
| `src/components/ui/state.tsx` | shared `Loading` / `ErrorState` / `Empty` blocks |
| `src/app/(app)/dashboard/page.tsx` | the dashboard: 6 KPI cards + 4 charts + top recommendations |

## Layout
- **KPI cards** — Total Students, Pass %, Placement %, Avg CGPA, Highest Package, Risk Students.
- **Charts** —
  - Admission Trend → line
  - Placement % by Department → bar
  - Risk Distribution → pie (Low/Medium/High)
  - Admission → Placement Funnel → descending labelled bars
- **Top Recommendations** — list with scope/priority/count badges.

## Notes
- `react-chartjs-2` + `chart.js` are registered once in `charts/index.tsx`
  (tree-shaken element registration). The funnel is a custom bar implementation
  since Chart.js has no native funnel type.
- The dashboard reads the materialised read model, so it reflects the last
  `/analytics/refresh` + `/risk/assess` (documented in Phase 9/11). Empty/zero
  values are expected until data is imported and the pipeline is run.

## Next slices
- **Slice 3** — CRUD screens: reusable DataTable + Drawer form over the factory
  endpoints (students, departments, subjects, companies, drives).
- **Slice 4** — Workflow UIs: bulk upload + error report, dynamic criteria
  builder, risk & recommendations views, report generation/download.
