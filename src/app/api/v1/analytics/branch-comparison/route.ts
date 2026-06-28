import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/** Branch comparison (Module 13): CGPA, attendance, arrears, placement by department. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "analytics.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const rows = await query(
    `SELECT d.code AS department, d.name AS department_name,
            count(*)::int AS total,
            round(avg(u.current_cgpa), 2) AS avg_cgpa,
            round(avg(u.avg_attendance_pct), 2) AS avg_attendance,
            round(avg(u.active_arrears), 2) AS avg_active_arrears,
            count(*) FILTER (WHERE u.is_placed)::int AS placed,
            round(100.0 * count(*) FILTER (WHERE u.is_placed) / NULLIF(count(*),0), 2) AS placement_pct,
            max(u.highest_package_lpa) AS highest_package_lpa
       FROM unified_student_profiles u
       JOIN departments d ON d.id = u.department_id
      WHERE u.institution_id = $1
      GROUP BY d.code, d.name
      ORDER BY placement_pct DESC NULLS LAST`,
    [institutionId],
  );
  return ok({ branches: rows });
});
