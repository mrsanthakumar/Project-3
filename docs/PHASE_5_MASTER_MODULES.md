# Phase 5 — Master / Org Modules

Implements Modules 2 (Department/Branch/Program/Cohort/Batch/Section), 5 (Subjects),
9 (Companies), and 20 (Institutions). Built on a reusable, tenant-scoped CRUD factory
so each resource is declared once and wired with ~5 lines.

## Approach: declarative CRUD factory
Rather than hand-write 10 near-identical controllers, the phase introduces:

| File | Role |
|---|---|
| `src/lib/query.ts` | parse `page/pageSize/sort/search/filter[...]` query params |
| `src/lib/crud.ts` | `crudRoutes(config)` → `{ collection:{GET,POST}, item:{GET,PUT,DELETE} }` |
| `src/lib/resources/master.ts` | one `ResourceConfig` per resource (columns, schemas, filters) |

The factory provides, for every resource:
- **Tenant scoping** — every query filtered by `institution_id` from the JWT (the `institutions` table itself is exempt — it's the tenant root).
- **RBAC** — `permissionView` on reads, `permissionWrite` on writes; `super_admin` bypasses.
- **Pagination + meta**, multi-column **sort** (whitelisted), **search** (ILIKE), and **filters** (whitelisted).
- **Soft delete** where the table has `deleted_at` (departments).
- **Audit logging** of CREATE/UPDATE/DELETE.
- **camelCase ↔ snake_case** mapping at the boundary.
- **DB error translation**: unique violation → 409 CONFLICT, FK violation → 422 UNPROCESSABLE.

## Resources & routes
| Resource | Module | Permission | Routes |
|---|---|---|---|
| Institutions | 20 | `institution.manage` | `/api/v1/institutions[/{id}]` |
| Departments | 2 | `department.crud` | `/api/v1/departments[/{id}]` |
| Programs | 2 | `department.crud` | `/api/v1/programs[/{id}]` |
| Branches | 2 | `department.crud` | `/api/v1/branches[/{id}]` |
| Regulations | 2 | `department.crud` | `/api/v1/regulations[/{id}]` |
| Cohorts | 2 | `department.crud` | `/api/v1/cohorts[/{id}]` |
| Batches | 2 | `department.crud` | `/api/v1/batches[/{id}]` |
| Sections | 2 | `department.crud` | `/api/v1/sections[/{id}]` |
| Subjects | 5 | `subject.crud` | `/api/v1/subjects[/{id}]` |
| Companies | 9 | `company.crud` | `/api/v1/companies[/{id}]` |

Each collection file: `export const { GET, POST } = crudRoutes(resource).collection;`
Each item file: `export const { GET, PUT, DELETE } = crudRoutes(resource).item;`

## Notable changes to shared code
- `src/lib/http.ts` — `handle()` now awaits Next.js 15 async `params` before invoking the handler.

## Example calls
```bash
# create a department (HOD/Administration)
curl -X POST localhost:3000/api/v1/departments \
  -H "authorization: Bearer <token>" -H "content-type: application/json" \
  -d '{"code":"CSE","name":"Computer Science & Engineering"}'

# list + filter + search + paginate
curl "localhost:3000/api/v1/subjects?filter[semester]=5&search=database&page=1&pageSize=20" \
  -H "authorization: Bearer <token>"

# super admin creating a tenant
curl -X POST localhost:3000/api/v1/institutions \
  -H "authorization: Bearer <superadmin-token>" -H "content-type: application/json" \
  -d '{"code":"ABC","name":"ABC College of Engineering","city":"Coimbatore"}'
```

## Next phase
Phase 6 — Student & Admission modules: full profiles, Excel/CSV bulk upload
(async job), search/filters, and admission analytics.
