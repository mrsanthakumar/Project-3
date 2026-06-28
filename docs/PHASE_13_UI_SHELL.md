# Phase 13 — Frontend UI · Slice 1 (Auth Shell + API Client)

First UI slice: the foundation every screen builds on. Verified with
`tsc --noEmit` (clean) — the whole project now type-checks.

## What was built
| Layer | File | Role |
|---|---|---|
| Token store | `src/lib/client/token.ts` | in-memory access token (never localStorage — XSS-safe) |
| API client | `src/lib/client/api.ts` | typed fetch, auto Bearer header, **401 → silent /auth/refresh → retry**, `apiGet/Post/Put/Patch/Delete`, `qs()`, `requestList()` |
| Auth context | `src/components/auth/AuthProvider.tsx` | bootstraps session from refresh cookie, `login/logout`, `can(permission)` |
| UI primitives | `src/components/ui/index.tsx` | Button, Input, Field, Card, Spinner, PageHeader (Tailwind) |
| Navigation | `src/components/layout/nav.ts` | permission-gated sidebar map |
| Chrome | `Sidebar.tsx`, `Topbar.tsx` | role-aware nav + user menu / logout |
| Providers | `src/components/providers.tsx` | wraps the app in `AuthProvider` |
| Routes | `(auth)/login`, `(app)/layout`, `(app)/dashboard`, `/` | login page, guarded shell, placeholder dashboard, root redirect |

## How auth works on the client
1. On load, `AuthProvider` calls `POST /auth/refresh` (httpOnly cookie) to mint an
   access token into memory, then `GET /auth/me` to hydrate the user.
2. The `(app)` layout shows a spinner until bootstrap finishes, then redirects to
   `/login` if there's no session.
3. Every API call attaches the in-memory Bearer token; on a 401 the client
   transparently refreshes once and retries (concurrent refreshes de-duped).
4. The sidebar renders only the sections/items the user's permissions allow —
   the same RBAC model as the backend, mirrored in the UI.

## Route structure
- `(auth)/login` — public, outside the app shell.
- `(app)/*` — everything behind the authenticated shell (Sidebar + Topbar).
  Future screens (students, dashboard, drives…) drop straight into this group.

## Try it
```bash
npm run dev    # then visit http://localhost:3000
# → redirects to /login; sign in with a seeded user (set a real bcrypt hash in seed.sql first)
```

## Next slices (remaining UI)
- **Slice 2** — Executive Dashboard: KPI cards + Chart.js bar/pie/line/funnel from `/dashboard/executive`.
- **Slice 3** — CRUD screens: reusable data-table + form, wired to the factory endpoints (students, departments, subjects, companies, drives).
- **Slice 4** — Workflow UIs: bulk-upload with error report, dynamic criteria builder, risk/recommendations views, report generation & download.
