# Phase 15 — Frontend UI · Slices 3 & 4 (Complete UI)

Completes the entire UI. Verified with a full `next build` — all API routes,
all pages, and middleware compile cleanly.

## Slice 3 — Reusable CRUD infrastructure + resource screens
A declarative CRUD UI factory mirroring the backend factory, so each screen is
a thin config.

| Component | Role |
|---|---|
| `useListApi` / `useApi` | paginated list / single GET hooks (loading, error, reload) |
| `DataTable` + `Pagination` | generic table with row actions |
| `Modal` | accessible dialog |
| `ResourceForm` | field-driven create/edit form (text/number/date/select/checkbox) |
| `OptionSelect` | FK `<select>` populated from a list endpoint |
| `BulkUploadButton` | Excel/CSV upload → `{base}/bulk-upload` with per-row error report |
| `ResourcePage` | ties it together: list + search + filters + create/edit/delete + bulk upload + RBAC-gated create |

**Screens (config-only):** Students, Departments, Subjects, Admissions,
Companies, Institutions, Attendance, Internal Marks, Semester Results,
Placements, Users.

## Slice 4 — Workflow screens (bespoke)
| Screen | Highlights |
|---|---|
| `/dashboard` | Executive KPIs + Chart.js bar/line/pie + funnel (Slice 2) |
| `/students/[id]` | Student journey: admission → CGPA trend chart → placement offers + editable employability profile |
| `/recruitment-drives/[id]` | **Dynamic criteria builder** (add/remove rules from the catalogue), Recompute, eligible-students list |
| `/risk` | active model summary, Run Assessment, level-filtered at-risk table with colour badges |
| `/stats` | run Pearson/Spearman/T-Test/ANOVA, live interpretation, recent reports |
| `/recommendations` | Generate, status workflow (Open→Done), rule builder with multi-condition editor |
| `/reports` | generate PDF/Excel + **authenticated blob download** + history |
| `/audit-logs` | keyset "load more", action filter |
| `/roles` | **permission editor** — checkbox matrix grouped by module (Module 1) |

## Backend added this phase (to back the admin UI)
- `GET/POST /users`, `PUT/DELETE /users/{id}` — user management with password hashing
- `GET /roles`, `GET/PUT /roles/{id}/permissions` — role permission management
- `GET /permissions` — permission catalogue

## Client architecture notes
- **Auth**: access token in memory, refresh in httpOnly cookie; the API client
  transparently refreshes on 401 and retries.
- **Downloads**: report files are fetched as authenticated blobs (`apiDownload`)
  since an `<a href>` can't carry the Bearer token.
- **RBAC mirrored**: sidebar and create buttons gate on the same permission
  codes the API enforces.

## Project status — all deliverables
Database, ER diagram, API design, Auth, Master modules, Admission, Academic,
Placement, Analytics engine, Risk, Statistics (Python), Recommendations,
Reports, Executive dashboard, Audit logs, Multi-college, **Testing**, and the
**full responsive UI** are complete. Only Deployment (Docker/CI) was
intentionally skipped per request.
