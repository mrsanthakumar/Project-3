#!/usr/bin/env bash
# =====================================================================
# Database setup: (reset) → schema → migrations → seed → demo data.
# Re-runnable: by default it DROPS existing data for a clean rebuild.
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/setup-db.sh
#
# Flags (env):
#   KEEP_DATA=1   skip the drop/reset (apply on top of existing schema)
#   SKIP_DEMO=1   do not load database/seed_demo.sql (structure + config only)
# =====================================================================
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1)

if [ "${KEEP_DATA:-0}" != "1" ]; then
  echo "→ Resetting database (dropping old data)…"
  "${PSQL[@]}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

echo "→ Applying schema…"
"${PSQL[@]}" -f "$ROOT/database/schema.sql"

echo "→ Applying migrations…"
for f in "$ROOT"/database/migrations/*.sql; do
  [ -e "$f" ] || continue
  echo "  • $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

echo "→ Seeding reference data…"
"${PSQL[@]}" -f "$ROOT/database/seed.sql"

if [ "${SKIP_DEMO:-0}" != "1" ]; then
  echo "→ Loading demo sample data…"
  "${PSQL[@]}" -f "$ROOT/database/seed_demo.sql"
fi

echo "✓ Database ready."
echo "  Admin (manage): admin@demo.edu / Admin@123"
echo "  Principal (view): principal@demo.edu / Admin@123"
echo "  Super Admin: superadmin@demo.edu / Admin@123   (institution code: DEMO)"
echo "  Next: open the Executive Dashboard and click \"Refresh Data\"."
