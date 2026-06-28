# Phase 11 — Reports & Executive Dashboard

Implements Module 17 (Reports — PDF & Excel) and Module 18 (Executive Dashboard).

## Dependencies
- `pdfkit` (+ `@types/pdfkit`) for PDF generation.
- `xlsx` (already present) for Excel.
- `REPORTS_DIR` env (default `storage/reports`) — generated files are written to
  `<REPORTS_DIR>/<institutionId>/<jobId>.<ext>`.

## Reports (Module 17)
| Layer | File |
|---|---|
| Data fetchers | `src/lib/reports/data.ts` |
| Excel renderer | `src/lib/reports/excel.ts` |
| PDF renderer | `src/lib/reports/pdf.ts` |
| Orchestrator | `src/lib/reports/generate.ts` |

Supported combinations:
- **PDF**: ADMISSION, ACADEMIC, PLACEMENT, RISK
- **Excel**: STUDENT, DEPARTMENT, PLACEMENT

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/reports` | report.export | `{reportType, format, params?}` → 202 + jobId + downloadUrl |
| GET | `/reports` | report.export | history |
| GET | `/reports/{jobId}` | report.export | status + downloadUrl when READY |
| GET | `/reports/{jobId}/download` | report.export | streams the file (audited DOWNLOAD) |

Each report job is tracked in `report_exports` (PROCESSING → READY / FAILED).
Generation runs inline and is the unit that moves to a queue worker later;
the 202 + poll contract already matches that future.

## Executive Dashboard (Module 18)
`GET /dashboard/executive` (permission `dashboard.executive`) returns, mostly
from `unified_student_profiles`:
- **KPIs**: total students, pass %, placement %, average CGPA, highest package, risk students
- **admissionTrend**: students per admission year
- **charts**: placement-by-department, risk distribution (LOW/MEDIUM/HIGH),
  admission→applied→selected funnel
- **topRecommendations**: top 5 open recommendations by priority

The frontend (built in the UI phase) renders these with Chart.js bar/pie/line/
funnel charts as specified.

## Data freshness
KPIs and charts read the unified read model, so they reflect the **last
`/analytics/refresh` + `/risk/assess`**. Pass % is computed live from
`semester_results`. Run the analytics/risk pipeline before relying on the
dashboard after large imports.

## Run
```bash
# REPORTS_DIR defaults to ./storage/reports (gitignored)
npm install   # pulls pdfkit
```

## Next phase
Phase 12 — Audit log API, automated tests, and deployment (Docker Compose for
Next + Postgres + Python stats service, env, migrations runner, CI notes).
