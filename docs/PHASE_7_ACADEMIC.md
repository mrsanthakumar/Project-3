# Phase 7 — Academic Modules

Implements Module 6 (Attendance), Module 7 (Internal Marks), and Module 8
(Semester Results) with manual + Excel/CSV entry, analytics, and an automatic
GPA/CGPA/arrears roll-up that keeps the student snapshot in sync.

## Migration
`database/migrations/003_academic_triggers.sql`:
- `internal_marks.internal_average` auto-computed (mean of provided components) on insert/update.
- `semester_results.is_arrear` defaults from `result = 'FAIL'` when not set.

## Roll-up engine — `src/lib/academic/rollup.ts`
`recomputeStudentAcademics(studentId)` runs in a transaction and:
- computes **GPA per semester** = Σ(grade_points × credits) / Σ(credits), credits from `subjects`;
- computes **cumulative CGPA** across semesters → upserts `semester_gpa`;
- recomputes **active_arrears** (subjects whose latest attempt is FAIL) and **history_arrears** (all is_arrear rows);
- syncs `students.current_cgpa / active_arrears / history_arrears`.

Triggered on every semester-result create and on every results bulk-upload
(once per affected student).

## Endpoints
### Attendance (Module 6) — `attendance.manage`
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/attendance` | factory CRUD |
| GET/PUT/DELETE | `/attendance/{id}` | factory |
| POST | `/attendance/bulk` | grid save, upsert on natural key, single transaction |
| POST | `/attendance/bulk-upload` | Excel/CSV |
| GET | `/attendance/analytics` | overall %, monthly, subject-wise, department-wise (PRESENT+OD = attended) |

### Internal Marks (Module 7) — `internal.manage`
| Method | Path | Notes |
|---|---|---|
| GET/POST, GET/PUT/DELETE | `/internal-marks[/{id}]` | factory CRUD; average auto-computed by trigger |
| POST | `/internal-marks/bulk-upload` | Excel/CSV |
| GET | `/internal-marks/analytics` | subject averages, top 10, weak 10 |

### Semester Results (Module 8) — `result.manage`
| Method | Path | Notes |
|---|---|---|
| GET | `/semester-results` | factory list |
| POST | `/semester-results` | **custom**: upsert + roll-up |
| GET/PUT/DELETE | `/semester-results/{id}` | factory |
| POST | `/semester-results/bulk-upload` | Excel/CSV + roll-up per student |
| GET | `/semester-results/analytics` | pass %, CGPA trend, arrear analysis, semester comparison |

## Shared import helper
`src/lib/import/run.ts` — `runBulkUpload(req, {entity, permission, importer})`
standardises parse → job → import → complete → 202 across academic uploads.
`src/lib/import/academic.ts` resolves rows by **register number** and **subject
code**, upserts, and (for results) recomputes academics for affected students.

## Bulk-upload sheet columns
- **Attendance**: `Register Number, Subject Code, Date, Status[, Period]`
- **Internal Marks**: `Register Number, Subject Code, Semester, Test1, Test2, Assignment`
- **Semester Results**: `Register Number, Subject Code, Semester, Grade, Grade Points, Result, Credits Earned`

## Design notes & limitations
- **No hardcoded grade scale**: `grade_points` are supplied per row (a grade→points
  map is institution-specific). A configurable grade-scale table can be added if
  you want server-side grade→points conversion.
- **PUT/DELETE on a single result** does not auto-trigger the roll-up (the factory
  handles those); re-import or the Phase 9 analytics refresh recomputes affected
  students. Create and bulk-upload — the common paths — do roll up immediately.
- Roll-up is synchronous; for very large result imports it moves to the queue
  worker alongside the importers in the deployment phase.

## Run
```bash
psql "$DATABASE_URL" -f database/migrations/003_academic_triggers.sql
```

## Next phase
Phase 8 — Recruitment & Placement: dynamic criteria engine (eligibility
recompute with explanations) and placement funnel + analytics.
