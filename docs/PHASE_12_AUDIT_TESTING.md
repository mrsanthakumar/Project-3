# Phase 12 — Audit Log API & Testing

Implements Module 19 (Audit Logs read API) and adds an automated test suite.
(Deployment intentionally skipped per request.)

## Audit Log API (Module 19)
The write path already exists everywhere via `recordAudit()` (login/logout,
create/update/delete, uploads, report download/export). This phase adds the
reader:

`GET /api/v1/audit-logs` — permission `audit.read`
- **Keyset pagination** on the BIGSERIAL `id` (the table is high-volume, so
  offset pagination would degrade); pass `?after=<id>` for the next page,
  response returns `nextCursor`.
- Filters: `user_id`, `action`, `entity`, `from`, `to` (ISO timestamps), `limit` (≤100).
- Returns `user`, `action`, `entity`, `entity_id`, `detail`, `ip_address`, `timestamp`.

## Testing
- **Runner**: Vitest (`npm test`, `npm run test:watch`), node environment,
  `@/*` alias wired, test env vars injected so `lib/env.ts` fail-fast passes.
- **Coverage (20 tests, all passing)** — the genuinely pure, high-value logic:
  | File | What it locks down |
  |---|---|
  | `query.test.ts` | list-param parsing: paging, `-`sort, `filter[...]` |
  | `risk.test.ts` | `triggered` comparators + `bandFor` score→level |
  | `recommendation.test.ts` | `cmp` comparator matrix + null handling |
  | `stats.test.ts` | `assertMetric` SQL-injection guard + interpretations |
  | `context.test.ts` | RBAC `requirePermission` + tenant scope (super-admin path) |
  | `auth.test.ts` | bcrypt hash/verify round-trip |

To make engine logic testable, `triggered`/`bandFor` (risk) and `cmp`
(recommendation) are now exported.

```
$ npm test
 ✓ 6 files, 20 tests passed
```

### What these tests deliberately cover (and what they don't)
Unit tests target **pure decision logic** — the comparator/scoring/parsing code
where bugs are silent and costly (a wrong comparator mis-flags eligibility or
risk for every student). They do **not** hit a live database. The recommended
next layer is **integration tests** against a disposable Postgres (Testcontainers
or a CI service container) exercising the CRUD factory, eligibility recompute,
the GPA roll-up, and the analytics refresh end-to-end — these need a DB and a
seeded schema, so they belong with the (skipped) deployment/CI setup.

## Status of the 20 deliverables
Modules 1–20 and dev-deliverables 1–13 are implemented as **backend + Python +
SQL**. Remaining: dev-deliverable 14 (testing — this phase, unit layer done),
15 (deployment — skipped), and the **frontend UI**, which has not been built
(see the note returned with this phase).
