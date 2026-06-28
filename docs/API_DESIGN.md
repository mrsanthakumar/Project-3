# Phase 3 — API Design
**Institutional Insights Dashboard** · Next.js 15 App Router (Route Handlers) + PostgreSQL + Python analytics service

---

## 1. Conventions

### 1.1 Base & versioning
- All routes live under the App Router: `app/api/v1/.../route.ts`.
- Base path: **`/api/v1`**. Breaking changes bump to `/api/v2`.
- Long-running analytics/stats are proxied to an internal **Python FastAPI service** (`ANALYTICS_URL`); the Next.js route is the public contract.

### 1.2 Resource naming
- Plural nouns, kebab-case: `/students`, `/recruitment-drives`, `/internal-marks`.
- Sub-resources nest one level: `/recruitment-drives/{id}/criteria`, `/recruitment-drives/{id}/eligible-students`.
- Actions that aren't CRUD use a verb suffix: `/recruitment-drives/{id}/recompute`, `/auth/forgot-password`.

### 1.3 HTTP semantics
| Method | Use | Success |
|---|---|---|
| GET | list / read | 200 |
| POST | create / action | 201 (create), 200/202 (action) |
| PUT / PATCH | full / partial update | 200 |
| DELETE | soft delete | 204 |

### 1.4 Standard envelopes
**Success (single):**
```json
{ "data": { ... }, "meta": null }
```
**Success (list, paginated):**
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 25, "total": 240, "totalPages": 10 }
}
```
**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "twelfth_percentage must be <= 100",
    "details": [{ "field": "twelfth_percentage", "issue": "max" }]
  }
}
```

### 1.5 Error codes → HTTP
| code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema failure |
| `UNAUTHENTICATED` | 401 | Missing/invalid/expired access token |
| `FORBIDDEN` | 403 | Authenticated but lacks permission / wrong tenant |
| `NOT_FOUND` | 404 | Resource absent in caller's institution |
| `CONFLICT` | 409 | Unique constraint (e.g. duplicate register_number) |
| `UNPROCESSABLE` | 422 | Valid shape, invalid business rule |
| `RATE_LIMITED` | 429 | Throttle |
| `INTERNAL` | 500 | Unhandled |

### 1.6 Query params (list endpoints)
`?page=1&pageSize=25&sort=-created_at&search=anand&filter[department_id]=...&filter[batch_id]=...`
- `sort`: comma list, `-` prefix = DESC.
- `filter[field]`: equality; range filters `filter[cgpa_gte]`, `filter[cgpa_lte]`.

### 1.7 Pagination
Offset pagination by default (`page`/`pageSize`, max `pageSize=100`). Audit logs & large exports use **keyset** (`?after=<cursor>`).

---

## 2. Authentication & Authorization

### 2.1 Token model (Module 1)
- **Access token**: JWT, ~15 min, sent as `Authorization: Bearer <jwt>`.
- **Refresh token**: opaque, httpOnly Secure cookie; hash stored in `user_sessions`.
- JWT claims:
```json
{
  "sub": "<user_id>",
  "iid": "<institution_id|null>",
  "role": "hod",
  "perms": ["student.read","attendance.manage", "..."],
  "dept": "<department_id|null>",
  "iat": 1750000000, "exp": 1750000900
}
```

### 2.2 Middleware chain (every protected route)
1. **Verify JWT** → 401 on failure.
2. **Tenant binding** — derive `institution_id` from token; Super Admin may pass `X-Institution-Id` to scope a request. All queries are filtered by this id (never trust a body-supplied institution_id).
3. **RBAC guard** — route declares required permission code; reject 403 if absent from `perms`.
4. **Data scope** — HOD limited to own `department_id`; Faculty Advisor to advised `section_id`(s); enforced as an extra WHERE clause, not just route-level.
5. **Audit** — mutating + sensitive-read actions append to `audit_logs`.

### 2.3 Auth endpoints
| Method | Path | Permission | Body / Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password, institutionCode? }` → access token + sets refresh cookie |
| POST | `/auth/refresh` | cookie | rotates refresh token, returns new access token |
| POST | `/auth/logout` | auth | revokes current session |
| POST | `/auth/change-password` | auth | `{ currentPassword, newPassword }` |
| POST | `/auth/forgot-password` | public | `{ email, institutionCode }` → emails reset token |
| POST | `/auth/reset-password` | public | `{ token, newPassword }` |
| GET | `/auth/me` | auth | current user + role + resolved permissions |

**Login 200:**
```json
{ "data": {
  "accessToken": "eyJ...",
  "user": { "id":"...", "fullName":"Demo Principal", "role":"principal",
            "institutionId":"...", "permissions":["dashboard.executive", "..."] }
}}
```

### 2.4 RBAC admin
| Method | Path | Permission |
|---|---|---|
| GET/POST | `/roles` | `role.manage` |
| GET/PUT/DELETE | `/roles/{id}` | `role.manage` |
| GET | `/permissions` | `role.manage` |
| PUT | `/roles/{id}/permissions` | `role.manage` — `{ permissionCodes: [...] }` |
| GET/POST | `/users` | `user.create` / `user.read` |
| GET/PUT/DELETE | `/users/{id}` | `user.update` / `user.delete` |

---

## 3. Master / Org Modules (Module 2, 5, 9, 20)

### 3.1 Institutions (Super Admin only)
| Method | Path | Permission |
|---|---|---|
| GET/POST | `/institutions` | `institution.manage` |
| GET/PUT/DELETE | `/institutions/{id}` | `institution.manage` |

### 3.2 Org tree (Module 2) — uniform CRUD, permission `department.crud`
| Resource | Collection | Item |
|---|---|---|
| Departments | `GET/POST /departments` | `GET/PUT/DELETE /departments/{id}` |
| Programs | `GET/POST /programs` | `GET/PUT/DELETE /programs/{id}` |
| Branches | `GET/POST /branches` | `…/branches/{id}` |
| Regulations | `GET/POST /regulations` | `…/regulations/{id}` |
| Cohorts | `GET/POST /cohorts` | `…/cohorts/{id}` |
| Batches | `GET/POST /batches` | `…/batches/{id}` |
| Sections | `GET/POST /sections` | `…/sections/{id}` |

### 3.3 Subjects (Module 5) — permission `subject.crud`
`GET/POST /subjects` · `GET/PUT/DELETE /subjects/{id}`
Filters: `filter[department_id]`, `filter[semester]`, `filter[regulation_id]`.

### 3.4 Companies (Module 9) — permission `company.crud`
`GET/POST /companies` · `GET/PUT/DELETE /companies/{id}`

---

## 4. Student & Admission (Modules 3, 4)

### 4.1 Students (`student.*`)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/students` | student.read | search + filters (dept, batch, section, cgpa range, arrears) |
| POST | `/students` | student.create | |
| GET | `/students/{id}` | student.read | includes extra profile |
| PUT | `/students/{id}` | student.update | |
| DELETE | `/students/{id}` | student.delete | soft delete |
| PUT | `/students/{id}/extra` | student.update | internship/cert/hackathon/coding_score |
| GET | `/students/{id}/unified-profile` | analytics.read | the read-model snapshot |
| POST | `/students/bulk-upload` | student.upload | multipart `.xlsx/.csv` |
| GET | `/students/template` | student.read | download import template |

**Bulk upload response (202):**
```json
{ "data": {
  "jobId": "imp_01H...", "status": "PROCESSING",
  "summary": { "totalRows": 320, "queued": 320 }
}}
```
`GET /students/bulk-upload/{jobId}` → progress + per-row validation errors.

**Create body (validated by Zod):**
```json
{
  "registerNumber":"21CSE001","name":"Anand R","gender":"MALE",
  "dateOfBirth":"2003-05-12","email":"anand@x.com","mobile":"9000000000",
  "tenthPercentage":88.5,"twelfthPercentage":91.2,"diplomaPercentage":null,
  "admissionType":"COUNSELING","cutoffMark":192.5,
  "departmentId":"...","batchId":"...","sectionId":"...","regulationId":"..."
}
```

### 4.2 Admissions (`admission.*`)
| Method | Path | Permission |
|---|---|---|
| GET/POST | `/admissions` | admission.crud |
| GET/PUT/DELETE | `/admissions/{id}` | admission.crud |
| POST | `/admissions/bulk-upload` | admission.crud |
| GET | `/admissions/analytics` | admission.analytics |

**Analytics response (Module 4):** `GET /admissions/analytics?filter[admission_year]=2024`
```json
{ "data": {
  "seatFillRate": { "sanctioned": 720, "filled": 690, "rate": 0.958 },
  "branchDemand": [ { "department":"CSE","applications":1200,"seats":180 } ],
  "trends": [ { "year":2022,"count":640 }, { "year":2023,"count":670 } ],
  "districtWise": [ { "district":"Chennai","count":210 } ],
  "genderRatio": { "MALE":420,"FEMALE":268,"OTHER":2 }
}}
```

---

## 5. Academic Modules (6, 7, 8)

### 5.1 Attendance (`attendance.manage`)
| Method | Path | Notes |
|---|---|---|
| GET | `/attendance` | filter by student/subject/date range |
| POST | `/attendance` | single mark |
| POST | `/attendance/bulk` | array of marks (manual grid save) |
| POST | `/attendance/bulk-upload` | Excel/CSV |
| GET | `/attendance/analytics` | monthly / subject-wise / department-wise |

`GET /attendance/analytics?groupBy=month&filter[department_id]=...`
```json
{ "data": {
  "overallPct": 81.4,
  "monthly": [ { "month":"2025-01","pct":83.2 } ],
  "subjectWise": [ { "subjectId":"...","code":"CS501","pct":78.0 } ],
  "departmentWise": [ { "department":"CSE","pct":80.1 } ]
}}
```

### 5.2 Internal marks (`internal.manage`)
| Method | Path |
|---|---|
| GET/POST | `/internal-marks` |
| PUT | `/internal-marks/{id}` |
| POST | `/internal-marks/bulk-upload` |
| GET | `/internal-marks/analytics` → `{ topStudents, weakStudents, subjectAverages }` |

### 5.3 Semester results (`result.manage`)
| Method | Path |
|---|---|
| GET/POST | `/semester-results` |
| POST | `/semester-results/bulk-upload` |
| GET | `/semester-results/analytics` |

`GET /semester-results/analytics`
```json
{ "data": {
  "passPercentage": 87.5,
  "cgpaTrend": [ { "semester":1,"avgCgpa":7.2 } ],
  "arrearAnalysis": { "withArrears":120,"clean":540,"avgArrears":0.6 },
  "semesterComparison": [ { "semester":3,"passPct":82.0 } ]
}}
```
> Posting results triggers an async roll-up that recomputes `semester_gpa`, `students.current_cgpa/arrears`, and marks the student's `unified_student_profiles` row stale.

---

## 6. Recruitment & Placement (Modules 10, 11)

### 6.1 Criteria master (`criteria.manage`)
| Method | Path | Notes |
|---|---|---|
| GET | `/criteria-master` | catalogue of usable eligibility fields |
| POST | `/criteria-master` | add custom criterion (data_type, source_path, allowed comparators) |
| PUT/DELETE | `/criteria-master/{id}` | |

### 6.2 Recruitment drives (`drive.manage`)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/recruitment-drives` | |
| GET/PUT/DELETE | `/recruitment-drives/{id}` | |
| GET/POST | `/recruitment-drives/{id}/criteria` | list / add rule rows |
| DELETE | `/recruitment-drives/{id}/criteria/{cid}` | |
| POST | `/recruitment-drives/{id}/recompute` | run eligibility engine |
| GET | `/recruitment-drives/{id}/eligible-students` | results + explanations |

**Add criteria body (no hardcoded rules — fully dynamic):**
```json
{ "criteria": [
  { "criteriaCode":"TENTH_PCT",   "comparator":"GTE", "value":80 },
  { "criteriaCode":"TWELFTH_PCT", "comparator":"GTE", "value":80 },
  { "criteriaCode":"CGPA",        "comparator":"GTE", "value":8 },
  { "criteriaCode":"DEPARTMENT",  "comparator":"EQ",  "value":"<dept_id>" },
  { "criteriaCode":"HISTORY_ARREARS","comparator":"LTE","value":2 }
], "matchMode":"ALL" }
```

**Recompute 200 / eligible-students:**
```json
{ "data": {
  "driveId":"...","matchMode":"ALL","evaluated":540,"eligible":126,
  "students": [
    { "studentId":"...","registerNumber":"21CSE001","isEligible":true,"failedCriteria":[] },
    { "studentId":"...","registerNumber":"21CSE044","isEligible":false,
      "failedCriteria":[ { "code":"CGPA","required":">= 8","actual":7.4 } ] }
  ]
}}
```

### 6.3 Placement (`placement.manage` / `placement.read`)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/placements` | record application/funnel rows |
| PUT | `/placements/{id}` | advance status, set package |
| POST | `/placements/bulk-upload` | |
| GET | `/placements/analytics` | |

`GET /placements/analytics?filter[batch_id]=...`
```json
{ "data": {
  "placementPercentage": 72.3,
  "highestPackageLpa": 24.0,
  "averagePackageLpa": 6.4,
  "recruiterAnalysis": [ { "company":"Acme","selected":18,"avgLpa":7.1 } ],
  "departmentWise": [ { "department":"CSE","placedPct":81.0 } ],
  "funnel": { "applied":480,"attended":420,"selected":312 }
}}
```

---

## 7. Analytics, Risk, Stats, Recommendations (Modules 12–16)

### 7.1 Unified analytics & cross-funnel (`analytics.read`)
| Method | Path | Notes |
|---|---|---|
| POST | `/analytics/refresh` | rebuild `unified_student_profiles` (scope optional) |
| GET | `/analytics/cohort` | cohort analysis |
| GET | `/analytics/branch-comparison` | branch comparison |
| GET | `/analytics/student-journey/{studentId}` | admission→academics→placement timeline |
| GET | `/analytics/funnel` | admission-to-placement funnel |

`GET /analytics/funnel?filter[cohort_id]=...`
```json
{ "data": { "admitted":720,"retained":690,"placementEligible":520,
            "applied":480,"selected":312,
            "conversion": { "admittedToPlaced":0.433 } } }
```

### 7.2 Risk prediction (`risk.read` / `risk.configure`)
| Method | Path | Notes |
|---|---|---|
| GET | `/risk/config` | active rule set, rules, bands |
| PUT | `/risk/config` | edit thresholds/weights/bands (configure perm) |
| POST | `/risk/assess` | run scoring (scope optional) |
| GET | `/risk/students` | list with risk_level filter |
| GET | `/risk/students/{studentId}` | score + factor explanation |

`GET /risk/students/{id}`
```json
{ "data": {
  "studentId":"...","riskLevel":"HIGH","riskScore":75,
  "factors":[
    { "category":"ACADEMIC","metric":"current_cgpa","value":5.4,"threshold":6,"weight":40,
      "message":"CGPA 5.4 is below 6" },
    { "category":"ATTENDANCE","metric":"avg_attendance_pct","value":68,"threshold":75,"weight":35,
      "message":"Attendance 68% is below 75%" }
  ]
}}
```

### 7.3 Statistical validation (`stats.run`) — proxied to Python service
| Method | Path | Body |
|---|---|---|
| POST | `/stats/pearson` | `{ x:"twelfth_percentage", y:"current_cgpa", scope:{...} }` |
| POST | `/stats/spearman` | `{ x:"avg_attendance_pct", y:"current_cgpa", scope:{...} }` |
| POST | `/stats/ttest` | `{ metric:"current_cgpa", groupBy:"is_placed", scope:{...} }` |
| POST | `/stats/anova` | `{ metric:"current_cgpa", groupBy:"department_id", scope:{...} }` |
| GET | `/stats/reports` | saved `statistical_reports` |

**Pearson 200:**
```json
{ "data": {
  "testType":"PEARSON","statistic":0.62,"pValue":0.0001,
  "sampleSize":540,"effectSize":0.62,
  "interpretation":"Moderate positive correlation between 12th % and CGPA (p < 0.05)."
}}
```

### 7.4 Recommendations (`recommendation.manage`)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/recommendation-rules` | author rules (conditions JSON) |
| PUT/DELETE | `/recommendation-rules/{id}` | |
| POST | `/recommendations/generate` | evaluate rules → create recommendations |
| GET | `/recommendations` | filter by scope/status |
| PATCH | `/recommendations/{id}` | update status (OPEN→DONE/DISMISSED) |

---

## 8. Reports & Dashboard (Modules 17, 18)

### 8.1 Reports (`report.export`)
| Method | Path | Notes |
|---|---|---|
| POST | `/reports` | `{ reportType, format, params }` → returns jobId (202) |
| GET | `/reports/{jobId}` | status + downloadUrl when READY |
| GET | `/reports` | history |
`reportType` ∈ ADMISSION, ACADEMIC, PLACEMENT, RISK, STUDENT, DEPARTMENT · `format` ∈ PDF, EXCEL.

### 8.2 Executive dashboard (`dashboard.executive`)
`GET /dashboard/executive?filter[cohort_id]=...`
```json
{ "data": {
  "kpis": {
    "totalStudents":2480,"passPercentage":87.5,"placementPercentage":72.3,
    "averageCgpa":7.4,"highestPackageLpa":24.0,"riskStudents":142
  },
  "admissionTrend":[ { "year":2022,"count":640 } ],
  "charts": {
    "passByDept":[ { "department":"CSE","passPct":91 } ],
    "placementByDept":[ { "department":"CSE","placedPct":81 } ],
    "riskDistribution":{ "LOW":1800,"MEDIUM":538,"HIGH":142 },
    "admissionToPlacementFunnel":{ "admitted":720,"applied":480,"selected":312 }
  },
  "topRecommendations":[ { "action":"Conduct Remedial Coaching","scope":"CSE","priority":2 } ]
}}
```

---

## 9. Audit Logs (Module 19)
| Method | Path | Permission |
|---|---|---|
| GET | `/audit-logs` | `audit.read` — keyset paginated, filter by user/action/entity/date |

Write path is internal (middleware/service helper `recordAudit({...})`), never a public POST.

---

## 10. Cross-cutting

### 10.1 Validation
- Every body/query validated with **Zod** schemas in `lib/validators/*`; failures → `VALIDATION_ERROR` with field-level `details`.

### 10.2 Rate limiting & security
- Auth endpoints throttled (e.g. 10/min/IP). Standard headers via middleware. Refresh token httpOnly+Secure+SameSite=Strict. Passwords hashed with bcrypt/argon2. No `institution_id` accepted from request bodies.

### 10.3 File uploads
- `multipart/form-data`, server-side parse (`xlsx`/`csv-parse`), schema-validate each row, return per-row errors, write valid rows in a transaction. Max size + mime enforced.

### 10.4 Async jobs
- Bulk uploads, analytics refresh, eligibility recompute, report generation return **202 + jobId**; poll `GET .../{jobId}`. Backed by a queue (BullMQ/pg-boss) — finalized in deployment phase.

### 10.5 Folder layout (App Router)
```
app/api/v1/
  auth/{login,refresh,logout,me,...}/route.ts
  students/route.ts            students/[id]/route.ts
  students/bulk-upload/route.ts
  recruitment-drives/[id]/criteria/route.ts
  recruitment-drives/[id]/recompute/route.ts
  ...
lib/
  auth/      (jwt, rbac guard, session)
  db/        (drizzle/prisma client, repositories)
  validators/ (zod schemas)
  analytics/ (python service client)
  services/  (business logic per module)
```

---

## 11. Endpoint count summary
~ 95 routes across 12 module groups. Every list endpoint: paginated + filterable + tenant-scoped + RBAC-guarded + audited where mutating.
