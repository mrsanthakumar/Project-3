import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Semester-results analytics (Module 8): pass %, CGPA trend, arrear analysis,
 * and per-semester comparison.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "result.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const dept = url.searchParams.get("filter[department_id]");
  const dj = dept ? "AND st.department_id = $2" : "";
  const args: unknown[] = dept ? [institutionId, dept] : [institutionId];

  const passExpr = `round(100.0 * SUM(CASE WHEN sr.result = 'PASS' THEN 1 ELSE 0 END) / NULLIF(count(*),0), 2)`;

  const [pass, cgpaTrend, arrear, semesterComparison] = await Promise.all([
    query<{ pct: string }>(
      `SELECT ${passExpr} AS pct FROM semester_results sr
         JOIN students st ON st.id = sr.student_id
        WHERE sr.institution_id = $1 ${dj}`,
      args,
    ),
    query(
      `SELECT sg.semester, round(avg(sg.cgpa), 2) AS avg_cgpa
         FROM semester_gpa sg JOIN students st ON st.id = sg.student_id
        WHERE sg.institution_id = $1 ${dj}
        GROUP BY sg.semester ORDER BY sg.semester`,
      args,
    ),
    query<{ with_arrears: string; clean: string; avg_arrears: string }>(
      `SELECT
         SUM(CASE WHEN st.active_arrears > 0 THEN 1 ELSE 0 END)::int AS with_arrears,
         SUM(CASE WHEN st.active_arrears = 0 THEN 1 ELSE 0 END)::int AS clean,
         round(avg(st.active_arrears), 2) AS avg_arrears
       FROM students st
       WHERE st.institution_id = $1 ${dept ? "AND st.department_id = $2" : ""} AND st.deleted_at IS NULL`,
      args,
    ),
    query(
      `SELECT sr.semester, ${passExpr} AS pass_pct
         FROM semester_results sr JOIN students st ON st.id = sr.student_id
        WHERE sr.institution_id = $1 ${dj}
        GROUP BY sr.semester ORDER BY sr.semester`,
      args,
    ),
  ]);

  return ok({
    passPercentage: Number(pass[0]?.pct ?? 0),
    cgpaTrend,
    arrearAnalysis: {
      withArrears: Number(arrear[0]?.with_arrears ?? 0),
      clean: Number(arrear[0]?.clean ?? 0),
      avgArrears: Number(arrear[0]?.avg_arrears ?? 0),
    },
    semesterComparison,
  });
});
