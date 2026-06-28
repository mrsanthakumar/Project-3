# Phase 9 — Unified Analytics Engine + Cross-Funnel

Implements Module 12 (Unified Analytics Engine) and Module 13 (Cross-Funnel
Analytics). Builds the single read model that every downstream feature uses.

## Unified profile builder — `src/lib/analytics/unified.ts`
`refreshUnifiedProfiles(institutionId, studentId?)` runs one `INSERT … SELECT …
ON CONFLICT DO UPDATE` that, per active student, joins:
- **Admission** — latest `admission_year` (lateral), admission_type, cutoff, 10th/12th/diploma %
- **Academics** — `current_cgpa`, active/history arrears (from the Phase 7 roll-up)
- **Attendance** — avg % (PRESENT+OD)
- **Internal marks** — avg internal
- **Employability** — internship/cert/hackathon counts, coding score
- **Placement** — is_placed, highest package, offers count

into `unified_student_profiles`. Risk columns (`risk_level`/`risk_score`) are
deliberately **left untouched on conflict** — they're owned by the Phase 10
risk engine, so a profile refresh never clobbers the latest risk score.

## Endpoints (all `analytics.read`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/analytics/refresh` | rebuild the read model (whole tenant or one student) |
| GET | `/analytics/cohort` | per admission-year: strength, avg CGPA, attendance, placement % |
| GET | `/analytics/branch-comparison` | per department: CGPA, attendance, arrears, placement %, top package |
| GET | `/analytics/student-journey/{studentId}` | admission → GPA trend → placement offers timeline |
| GET | `/analytics/funnel` | admitted → retained → applied → selected (+ conversion); cohort/dept scoped |

## Why a materialised read model (not live joins)
Cross-funnel dashboards touch admission, attendance, internal marks, results,
and placement at once. Computing those joins live on every dashboard hit would
be slow and lock-heavy. Instead the engine **precomputes one row per student**;
dashboards then run simple `GROUP BY`s over a single table. Trade-off: the
snapshot can lag until refreshed — so refresh is triggered after bulk imports
and can be scheduled (deployment phase) or called per-student after edits.

## Refresh triggers (recommended wiring)
- After `students` / `attendance` / `internal-marks` / `semester-results` /
  `placements` bulk uploads.
- Per-student after a single `semester-results` write (the roll-up already runs;
  follow with `refreshUnifiedProfiles(inst, studentId)` — to be wired when the
  job queue lands).
- On demand via `POST /analytics/refresh`.

## Next phase
Phase 10 — Risk Prediction (configurable rules → score/band/explanation,
writing `risk_level`/`risk_score` back onto the unified profile), the Python
Statistical Validation service (Pearson/Spearman/T-Test/ANOVA), and the
Recommendation engine.
