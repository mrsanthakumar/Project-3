# Phase 8 — Recruitment & Placement

Implements Module 10 (Dynamic Recruitment Drive Management) and Module 11
(Placement Management). The centrepiece is a **fully dynamic eligibility
engine** — no eligibility rule is hardcoded anywhere.

## Eligibility engine — `src/lib/eligibility/engine.ts`
`recomputeDriveEligibility(driveId, institutionId)`:
1. Builds a **student evaluation context** by joining `students` +
   `student_profiles_extra`, aliasing columns to match `criteria_master.source_path`.
2. Loads the drive's `recruitment_criteria` joined to `criteria_master`.
3. For each active student, evaluates every criterion via a comparator function
   supporting `GTE/LTE/GT/LT/EQ/NEQ/IN/NOT_IN/BETWEEN` over numeric, text, and
   JSON-array values.
4. Applies `match_mode` (`ALL` = AND, `ANY` = OR) and writes
   `drive_eligible_students` with `is_eligible` + a `failed_criteria` JSON
   explanation per student.

Because criteria are data (catalogue + per-drive rows), adding a new rule from
the UI requires **zero code changes**.

## Endpoints
### Criteria catalogue (Module 10) — `criteria.manage`
| Method | Path | Notes |
|---|---|---|
| GET | `/criteria-master` | global catalogue + tenant custom items |
| POST | `/criteria-master` | create a tenant-scoped custom criterion |
| DELETE | `/criteria-master/{id}` | soft-disable a tenant criterion (global = read-only) |

### Recruitment drives (Module 10)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET/POST | `/recruitment-drives` | placement.read / drive.manage | factory CRUD |
| GET/PUT/DELETE | `/recruitment-drives/{id}` | … | factory |
| GET/POST | `/recruitment-drives/{id}/criteria` | placement.read / drive.manage | list / add rules |
| DELETE | `/recruitment-drives/{id}/criteria/{cid}` | drive.manage | remove a rule |
| POST | `/recruitment-drives/{id}/recompute` | drive.manage | run the engine |
| GET | `/recruitment-drives/{id}/eligible-students` | placement.read | results + failure explanations |

### Placements (Module 11)
| Method | Path | Permission |
|---|---|---|
| GET/POST, GET/PUT/DELETE | `/placements[/{id}]` | placement.read / placement.manage |
| POST | `/placements/bulk-upload` | placement.manage |
| GET | `/placements/analytics` | placement.read |

`/placements/analytics` → placement %, highest/avg package, recruiter analysis,
department-wise placement, applied→attended→selected funnel.

## Example: configure & run a drive
```bash
# 1. add dynamic rules (the spec example, verbatim — none hardcoded)
curl -X POST localhost:3000/api/v1/recruitment-drives/<id>/criteria \
  -H "authorization: Bearer <token>" -H "content-type: application/json" -d '{
    "matchMode":"ALL",
    "criteria":[
      {"criteriaCode":"TENTH_PCT","comparator":"GTE","value":80},
      {"criteriaCode":"TWELFTH_PCT","comparator":"GTE","value":80},
      {"criteriaCode":"CGPA","comparator":"GTE","value":8},
      {"criteriaCode":"DEPARTMENT","comparator":"EQ","value":"<dept_id>"},
      {"criteriaCode":"HISTORY_ARREARS","comparator":"LTE","value":2}
    ]}'

# 2. compute eligible students
curl -X POST localhost:3000/api/v1/recruitment-drives/<id>/recompute \
  -H "authorization: Bearer <token>"

# 3. read results with per-student explanations
curl "localhost:3000/api/v1/recruitment-drives/<id>/eligible-students?filter[eligible]=true" \
  -H "authorization: Bearer <token>"
```

## Bulk-upload sheet columns
- **Placements**: `Register Number, Company, Drive, Applied, Attended, Selected, Package, Internship`

## Design notes & limitations
- **Eligibility is recomputed on demand** (`/recompute`) and stored, rather than
  evaluated live per query — keeps the eligible-students read fast and gives a
  stable, explainable snapshot. Re-run after criteria or academic changes.
- **DEPARTMENT criterion** compares against `department_id` (UUID), so the UI
  passes the department id as the value.
- **Engine reads live student columns** today; once Phase 9 builds
  `unified_student_profiles`, the engine can point `source_path` at the snapshot
  for richer fields without changing the comparator logic.

## Next phase
Phase 9 — Unified Analytics Engine + Cross-Funnel: build/refresh
`unified_student_profiles` and the cohort / branch / journey / admission-to-
placement funnel dashboards.
