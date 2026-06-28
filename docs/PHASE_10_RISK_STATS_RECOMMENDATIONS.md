# Phase 10 — Risk Prediction · Statistical Validation · Recommendations

Implements Module 14 (Risk Prediction Engine), Module 15 (Statistical
Validation, Python) and Module 16 (Recommendation Engine). All three are
configuration-driven — no thresholds, rules, or recommendations are hardcoded.

## Module 14 — Risk Prediction (`src/lib/risk/engine.ts`)
`assessRisk(institutionId, studentId?)`:
- loads the active `risk_rule_sets` + `risk_rules` + `risk_bands`;
- per student, **score = Σ weight of every rule whose at-risk condition is true**
  (read from `unified_student_profiles`);
- **level = band** containing the score; **factors** = triggered rules with a
  `{value}`/`{threshold}` templated message;
- writes `risk_assessments` and denormalises `risk_level`/`risk_score` onto the
  unified profile.

| Method | Path | Permission |
|---|---|---|
| GET | `/risk/config` | risk.read |
| PUT | `/risk/config` | risk.configure (replace rules + bands) |
| POST | `/risk/assess` | risk.read |
| GET | `/risk/students` | risk.read (`?filter[risk_level]=HIGH`) |
| GET | `/risk/students/{studentId}` | risk.read (score + factor explanation) |

Default model (seeded): CGPA < 6 (w40), Attendance < 75 (w35), Active Arrears
> 3 (w25); bands 0–33 LOW / 34–66 MEDIUM / 67–100 HIGH — all editable via PUT.

## Module 15 — Statistical Validation (Python)
`analytics-service/` — a **stateless FastAPI + SciPy** service with `/pearson`,
`/spearman`, `/ttest`, `/anova`, `/health`. It receives raw arrays and returns
statistics; it has **no DB access**.

Node side (`src/lib/analytics/stats.ts` + `/stats/*` routes):
1. whitelists metrics → `unified_student_profiles` columns (SQL-injection safe);
2. fetches/scopes the data for the tenant;
3. calls the Python service;
4. interprets the result and persists it to `statistical_reports`.

| Method | Path | Test |
|---|---|---|
| POST | `/stats/pearson` | `{x, y}` — e.g. 12th % vs CGPA |
| POST | `/stats/spearman` | `{x, y}` — e.g. Attendance vs CGPA |
| POST | `/stats/ttest` | `{metric}` — Placed vs Not Placed (Welch + Cohen's d) |
| POST | `/stats/anova` | `{metric}` — branch-wise (department) |
| GET | `/stats/reports` | saved reports |

## Module 16 — Recommendation Engine (`src/lib/recommendation/engine.ts`)
`generateRecommendations(institutionId)` evaluates active `recommendation_rules`
(conditions JSON + ALL/ANY logic) at STUDENT / DEPARTMENT / INSTITUTION scope
against unified-profile metrics and department aggregates, then regenerates
`recommendations` (clearing prior OPEN ones, preserving actioned ones).

| Method | Path | Permission |
|---|---|---|
| GET/POST, GET/PUT/DELETE | `/recommendation-rules[/{id}]` | recommendation.manage |
| POST | `/recommendations/generate` | recommendation.manage |
| GET | `/recommendations` | recommendation.manage |
| PATCH | `/recommendations/{id}` | recommendation.manage (status workflow) |

Seeded rules match the spec: attendance < 75 → Counseling; placement < 60% &
CGPA > 7 → Improve Industry Connect; high-arrear ratio → Remedial Coaching.

## Shared-code change
- `src/lib/crud.ts` — `ResourceConfig.jsonColumns` lets the factory `JSON.stringify`
  jsonb fields on write (used by `recommendation_rules.conditions`).

## Order of operations
`/analytics/refresh` → `/risk/assess` → `/recommendations/generate`
(risk reads the unified profile; recommendations read both). Department metrics
like `high_arrear_ratio` are computed as students with `active_arrears > 3` /
total — adjustable in the engine if you want a different definition.

## Run
```bash
# Python service
cd analytics-service && pip install -r requirements.txt && uvicorn main:app --port 8000
# Node: set ANALYTICS_URL=http://localhost:8000
```

## Next phase
Phase 11 — Reports (PDF/Excel export jobs) & Executive Dashboard (KPIs + charts
data for the Principal view).
