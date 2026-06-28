import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admission analytics (Module 4): branch demand, year trends, district-wise
 * spread, and gender ratio. Seat-fill rate reports filled counts; sanctioned
 * seats are not yet modelled, so `rate` is null until a seat-config table is
 * added — surfaced explicitly rather than guessed.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "admission.analytics");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const year = url.searchParams.get("filter[admission_year]");
  const yearFilter = year ? "AND a.admission_year = $2" : "";
  const args: unknown[] = year ? [institutionId, Number(year)] : [institutionId];

  const [trends, districtWise, branchDemand, genderRows, filled] = await Promise.all([
    query(
      `SELECT admission_year AS year, count(*)::int AS count
         FROM admissions a WHERE a.institution_id = $1
         GROUP BY admission_year ORDER BY admission_year`,
      [institutionId],
    ),
    query(
      `SELECT COALESCE(district,'Unknown') AS district, count(*)::int AS count
         FROM admissions a WHERE a.institution_id = $1 ${yearFilter}
         GROUP BY district ORDER BY count DESC`,
      args,
    ),
    query(
      `SELECT d.code AS department, count(*)::int AS admissions
         FROM admissions a
         JOIN departments d ON d.id = a.department_id
        WHERE a.institution_id = $1 ${yearFilter}
        GROUP BY d.code ORDER BY admissions DESC`,
      args,
    ),
    query<{ gender: string | null; count: number }>(
      `SELECT s.gender, count(*)::int AS count
         FROM admissions a
         JOIN students s ON s.id = a.student_id
        WHERE a.institution_id = $1 ${yearFilter}
        GROUP BY s.gender`,
      args,
    ),
    query<{ count: number }>(
      `SELECT count(*)::int AS count FROM admissions a
        WHERE a.institution_id = $1 ${yearFilter}`,
      args,
    ),
  ]);

  const genderRatio = genderRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.gender ?? "UNKNOWN"] = r.count;
    return acc;
  }, {});

  return ok({
    seatFillRate: { filled: filled[0]?.count ?? 0, sanctioned: null, rate: null },
    branchDemand,
    trends,
    districtWise,
    genderRatio,
  });
});
