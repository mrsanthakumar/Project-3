# Phase 4 — Authentication Module

First code phase. Delivers the Next.js 15 scaffold + a complete JWT/RBAC auth
system implementing Module 1.

## What was built

### Project scaffold
| File | Purpose |
|---|---|
| `package.json` | Next 15, React 19, pg, jose, bcryptjs, zod, chart.js |
| `tsconfig.json` | `@/*` → `src/*` path alias, strict mode |
| `next.config.ts` | marks `pg`/`bcryptjs` as server-external |
| `tailwind.config.ts`, `postcss.config.mjs` | styling |
| `.env.example` | all required env vars |
| `src/app/{layout,page}.tsx`, `globals.css` | app shell |

### Auth library (`src/lib/`)
| File | Responsibility |
|---|---|
| `env.ts` | validated env access (fail-fast) |
| `db/index.ts` | shared pg pool, `query` / `queryOne` / `withTransaction` |
| `http.ts` | response envelopes, `ApiError`, `handle()` wrapper, Zod→400 mapping |
| `auth/password.ts` | bcrypt hash/verify |
| `auth/jwt.ts` | `jose` HS256 sign/verify (Edge-compatible) |
| `auth/session.ts` | opaque refresh tokens (SHA-256 hashed in DB), rotation, cookie helpers |
| `auth/users.ts` | login lookup, permission resolution |
| `auth/context.ts` | `getAuthContext`, `requirePermission`, `resolveInstitutionScope` |
| `audit.ts` | `recordAudit`, `clientIp` (Module 19 write path) |
| `validators/auth.ts` | Zod schemas |
| `middleware.ts` | Edge JWT verify → forwards `x-auth-*` headers |

### Endpoints (`src/app/api/v1/auth/`)
`login`, `refresh`, `logout`, `me`, `change-password`, `forgot-password`, `reset-password`
— matching the contract in `docs/API_DESIGN.md` §2.

## Security properties
- **Access/refresh split**: 15-min JWT access token + 30-day opaque refresh token in an httpOnly/Secure/SameSite=Strict cookie.
- **Refresh tokens hashed at rest** (SHA-256) and **rotated** on every refresh; a stolen DB row can't be replayed.
- **Permissions baked into the JWT** so route guards need no extra DB round-trip; `super_admin` bypasses checks.
- **Tenant id never trusted from the body** — derived from the token; Super Admin scopes via `X-Institution-Id`.
- **Account enumeration mitigated** on login (constant-ish path) and forgot-password (uniform 200).
- **Password change / reset revokes existing sessions.**

## How to run
```bash
cp .env.example .env        # set DATABASE_URL + JWT_SECRET
npm install
npm run db:schema           # apply database/schema.sql
npm run db:seed             # apply database/seed.sql
npm run dev
```

## Smoke test
```bash
# login (seeded principal — change the hash in seed.sql to a real bcrypt first)
curl -X POST localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"principal@demo.edu","password":"Admin@123","institutionCode":"DEMO"}'

# authed call
curl localhost:3000/api/v1/auth/me -H "authorization: Bearer <accessToken>"
```

> Note: `seed.sql` ships a placeholder password hash. Generate a real one
> (`bcrypt.hash("Admin@123", 10)`) and update the seed before logging in.

## Next phase
Phase 5 — Master/Org modules (departments, programs, branches, cohorts,
batches, sections, subjects, companies) reusing `handle()`, `requirePermission`,
and tenant scoping established here.
