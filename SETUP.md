# Project Setup — Institutional Insights Dashboard

Admission → Academics → Placement Analytics System
**Next.js 15 + PostgreSQL + Python (FastAPI/SciPy)**

---

## 1. Prerequisites
- **Node.js** ≥ 20 and npm
- **PostgreSQL** ≥ 15 (with `psql` on PATH)
- **Python** ≥ 3.11 (only for the Statistics module)

---

## 2. Install dependencies
```bash
npm install
```

## 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```ini
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/institutional_insights
JWT_SECRET=<run: openssl rand -base64 48>
ANALYTICS_URL=http://localhost:8000
REPORTS_DIR=storage/reports
```
> `DATABASE_URL` and `JWT_SECRET` are **required** — the app fails fast without them.

## 4. Create the database
```bash
createdb institutional_insights        # or: psql -c "CREATE DATABASE institutional_insights;"
```

## 5. Set up the database (one command)
```bash
export DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/institutional_insights
npm run db:setup
```
This **resets the database (drops old data)** and rebuilds it, in order:
1. drop & recreate `public` schema (clean slate)
2. `database/schema.sql` — all tables, enums, FKs, indexes
3. `database/migrations/*.sql` — import jobs, academic triggers, password fix
4. `database/seed.sql` — institution, RBAC, criteria catalogue, risk model
5. `database/seed_demo.sql` — sample students/admissions/results/placements + Admin user

You should see `✓ Database ready.` with the login accounts listed.

Flags:
- `KEEP_DATA=1 npm run db:setup` — apply without dropping existing data
- `SKIP_DEMO=1 npm run db:setup` — structure + config only (no sample data)

> **Running steps manually instead?** `npm run db:schema` → apply each file in
> `database/migrations/` in numeric order → `npm run db:seed` → optionally
> `psql "$DATABASE_URL" -f database/seed_demo.sql`.

## 6. Run the web app
```bash
npm run dev          # http://localhost:3000
```

## 7. Run the Statistics service (optional — only for the Stats screen)
```bash
cd analytics-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 8. Log in
Open **http://localhost:3000** → redirected to `/login`.

| Field | Value |
|---|---|
| Institution Code | `DEMO` |
| Email | `superadmin@demo.edu` |
| Password | `Admin@123` |

A Principal account also exists: `principal@demo.edu` / `Admin@123`.

> ⚠️ The password is exactly `Admin@123` — **not** `Admin@₹123`. On some Mac
> keyboards `Option/Alt+4` types `₹`; type a plain `1` after `@`.

---

## 8a. Load demo data (recommended — otherwise the app is empty)
`seed.sql` loads only structure + config (no students). To populate dashboards:
```bash
psql "$DATABASE_URL" -f database/seed_demo.sql
```
This adds sample students, admissions, results, placements, **and an
Administration user** (`admin@demo.edu` / `Admin@123`).

> **Roles matter.** `principal@demo.edu` is **read-only/analytics** and cannot
> open CRUD screens (e.g. Admissions → "Missing permission" is expected). Use
> `admin@demo.edu` (Administration) to create/manage records.

After loading, open **Executive Dashboard → "Refresh Data"** to build the
analytics read model so KPIs and charts populate.

## 9. First-run data pipeline
The dashboard, risk, and recommendations read a **materialised read model**, so
after importing data run these once (any order shown):
```text
POST /api/v1/analytics/refresh          # build unified profiles
POST /api/v1/risk/assess                # score risk
POST /api/v1/recommendations/generate   # generate recommendations
```
From the UI: Risk → "Run Assessment", Recommendations → "Generate". (A drive's
eligibility is computed from its detail page → "Recompute Eligibility".)

---

## 10. Tests
```bash
npm test          # 20 unit tests (pure logic)
```

## 11. Record a feature walkthrough (MP4)
Records a single **Super Admin** video — full access, so it covers every screen
and performs the key actions: Refresh Data, open a create form, open the
bulk-upload dialog, open a student's journey, recompute drive eligibility, run a
statistics test, generate recommendations, generate a report, and run a risk
assessment.

```bash
# one-time
npm i -D playwright
npx playwright install chromium
brew install ffmpeg            # macOS — for MP4 (else you get .webm); Linux: sudo apt-get install -y ffmpeg

# make sure the app + data are ready
npm run db:setup               # schema + seed + demo data
npm run dev                    # in a separate terminal — leave it running

# record → recordings/walkthrough.mp4
npm run demo:record
```

Output: `recordings/walkthrough.mp4` (gitignored).

Options:
- `APP_URL=https://your-host npm run demo:record` — target a non-default host
- `DEMO_EMAIL=… DEMO_PASSWORD=… npm run demo:record` — record a different login

Login used: `superadmin@demo.edu` / `Admin@123` (the DEMO institution is
auto-selected for the recording).

---

## Troubleshooting

**Login fails / "Invalid email or password"**
You likely seeded before the password-hash fix. Apply:
```bash
psql "$DATABASE_URL" -f database/migrations/004_fix_bootstrap_password.sql
```
This resets both bootstrap users to `Admin@123`. Then log in again.

**`/api/v1/auth/refresh` shows red in the Network tab on the login page**
Expected — there's no session yet, so the bootstrap refresh returns 401. It
turns green after you log in.

**"Missing required env var: DATABASE_URL / JWT_SECRET"**
`.env` isn't loaded or the var is blank. Confirm `.env` exists and restart `npm run dev`.

**Statistics screen errors with "service unavailable"**
The Python service (step 7) isn't running, or `ANALYTICS_URL` is wrong.

**Dropdowns (department/subject) are empty when adding records**
Create the referenced master data first (Departments, Subjects, etc.) or seed it.

---

## What's intentionally not included
- **Deployment** (Docker/CI) — not set up per request; run locally as above.
- Heavy operations (bulk upload, analytics refresh, reports) run **inline**, not
  on a background queue. Fine for typical data volumes.
- Email delivery for password reset (token is logged in dev).
See `docs/PHASE_15_UI_COMPLETE.md` for the full pending list.
