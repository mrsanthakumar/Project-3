# Phase 6 — Student & Admission Modules

Implements Module 3 (Students) and Module 4 (Admissions): full profiles,
employability extras, the unified-profile read endpoint, Excel/CSV bulk upload
with a tracked job + per-row error report, and admission analytics.

## New dependency & migration
- `xlsx` (SheetJS) — reads both `.xlsx` and `.csv`.
- `database/migrations/002_import_jobs.sql` — `import_jobs` table backing the
  202 + jobId / poll pattern.

## Shared import infrastructure (`src/lib/import/`)
| File | Role |
|---|---|
| `parse.ts` | `parseUpload(req)` — multipart → first sheet rows, with size/mime guards and header normalisation |
| `jobs.ts` | create/complete/fail/get `import_jobs` lifecycle |
| `students.ts` | row → student record, dept-code resolution, per-row insert with error capture |
| `admissions.ts` | row → admission record, links to students by register number |

## Endpoints
### Students (Module 3)
| Method | Path | Permission |
|---|---|---|
| GET / POST | `/students` | student.read / **student.create** |
| GET / PUT / DELETE | `/students/{id}` | student.read / student.update / student.delete |
| PUT | `/students/{id}/extra` | student.update — upsert internship/cert/hackathon/coding score |
| GET | `/students/{id}/unified-profile` | analytics.read — snapshot or live base profile |
| POST | `/students/bulk-upload` | student.upload — 202 + jobId + summary + first 100 errors |
| GET | `/students/bulk-upload/{jobId}` | student.read — full job status + error report |
| GET | `/students/template` | student.read — CSV import template |

### Admissions (Module 4)
| Method | Path | Permission |
|---|---|---|
| GET / POST | `/admissions` | admission.crud |
| GET / PUT / DELETE | `/admissions/{id}` | admission.crud |
| POST | `/admissions/bulk-upload` | admission.crud |
| GET | `/admissions/analytics` | admission.analytics |

`GET /admissions/analytics` returns `seatFillRate`, `branchDemand`, `trends`,
`districtWise`, `genderRatio` (gender joined from students).

## Shared-code change
- `src/lib/crud.ts` — `ResourceConfig` now supports optional
  `permissionCreate` / `permissionUpdate` / `permissionDelete` (students need
  distinct create/update/delete permissions); they fall back to `permissionWrite`.

## Design decisions & honest limitations
- **Bulk upload processes inline** and writes the job record, returning 202 +
  jobId so the contract matches the API design. For very large files this
  same loop is what moves to a queue worker in the deployment phase — the
  client contract won't change.
- **Per-row resilience**: a bad row (duplicate register number, unknown
  department, validation failure) is recorded as an error and skipped; the
  rest of the file still imports. Errors are row-numbered and field-tagged.
- **Seat-fill rate** reports filled counts but `rate: null` — sanctioned seat
  capacity isn't modelled yet. Flagged rather than fabricated; a `dept_seats`
  config table can be added if you want a true rate.
- **CGPA/arrears** are writable here (they're listed Module 3 fields) but are
  authoritatively maintained by the results roll-up (Phase 7) and analytics
  refresh (Phase 9).

## Run
```bash
npm run db:schema && npm run db:seed
psql "$DATABASE_URL" -f database/migrations/002_import_jobs.sql
npm run dev
```

## Next phase
Phase 7 — Academic modules: attendance, internal marks, semester results
(+ GPA/CGPA roll-up that updates the student snapshot) with their analytics.
