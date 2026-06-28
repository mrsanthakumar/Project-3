import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/** Cohort analysis (Module 13): per admission-year strength, CGPA, attendance, placement. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "analytics.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const rows = await query(
    `SELECT admission_year,
            count(*)::int AS total,
            round(avg(current_cgpa), 2) AS avg_cgpa,
            round(avg(avg_attendance_pct), 2) AS avg_attendance,
            count(*) FILTER (WHERE is_placed)::int AS placed,
            round(100.0 * count(*) FILTER (WHERE is_placed) / NULLIF(count(*),0), 2) AS placement_pct
       FROM unified_student_profiles
      WHERE institution_id = $1
      GROUP BY admission_year
      ORDER BY admission_year`,
    [institutionId],
  );
  return ok({ cohorts: rows });
});
