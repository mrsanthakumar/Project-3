import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Principal / Executive dashboard (Module 18): headline KPIs + chart datasets,
 * read almost entirely from the unified read model for speed.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "dashboard.executive");
  const institutionId = resolveInstitutionScope(ctx, req);

  const [kpis, pass, admissionTrend, placementByDept, riskDist, funnel, recs] = await Promise.all([
    queryOne<{
      total_students: number; avg_cgpa: string; highest_package: string;
      placed: number; risk_students: number;
    }>(
      `SELECT
         count(*)::int AS total_students,
         round(avg(current_cgpa), 2) AS avg_cgpa,
         max(highest_package_lpa) AS highest_package,
         count(*) FILTER (WHERE is_placed)::int AS placed,
         count(*) FILTER (WHERE risk_level = 'HIGH')::int AS risk_students
       FROM unified_student_profiles WHERE institution_id = $1`,
      [institutionId],
    ),
    queryOne<{ pct: string }>(
      `SELECT round(100.0 * SUM(CASE WHEN result='PASS' THEN 1 ELSE 0 END)/NULLIF(count(*),0),2) AS pct
         FROM semester_results WHERE institution_id = $1`,
      [institutionId],
    ),
    query(
      `SELECT admission_year AS year, count(*)::int AS count
         FROM unified_student_profiles WHERE institution_id = $1 AND admission_year IS NOT NULL
        GROUP BY admission_year ORDER BY admission_year`,
      [institutionId],
    ),
    query(
      `SELECT d.code AS department,
              round(100.0*count(*) FILTER (WHERE u.is_placed)/NULLIF(count(*),0),2) AS placed_pct
         FROM unified_student_profiles u JOIN departments d ON d.id = u.department_id
        WHERE u.institution_id = $1 GROUP BY d.code ORDER BY d.code`,
      [institutionId],
    ),
    queryOne<{ low: number; medium: number; high: number }>(
      `SELECT count(*) FILTER (WHERE risk_level='LOW')::int AS low,
              count(*) FILTER (WHERE risk_level='MEDIUM')::int AS medium,
              count(*) FILTER (WHERE risk_level='HIGH')::int AS high
         FROM unified_student_profiles WHERE institution_id = $1`,
      [institutionId],
    ),
    queryOne<{ admitted: number; applied: number; selected: number }>(
      `SELECT count(*)::int AS admitted,
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM placements p WHERE p.student_id = u.student_id AND p.applied))::int AS applied,
              count(*) FILTER (WHERE u.is_placed)::int AS selected
         FROM unified_student_profiles u WHERE institution_id = $1`,
      [institutionId],
    ),
    query(
      `SELECT action_text, scope_level, priority, count(*)::int AS count
         FROM recommendations WHERE institution_id = $1 AND status = 'OPEN'
        GROUP BY action_text, scope_level, priority ORDER BY priority ASC LIMIT 5`,
      [institutionId],
    ),
  ]);

  const total = Number(kpis?.total_students ?? 0);
  const placed = Number(kpis?.placed ?? 0);

  return ok({
    kpis: {
      totalStudents: total,
      passPercentage: Number(pass?.pct ?? 0),
      placementPercentage: total ? Math.round((placed / total) * 10000) / 100 : 0,
      averageCgpa: Number(kpis?.avg_cgpa ?? 0),
      highestPackageLpa: kpis?.highest_package ? Number(kpis.highest_package) : 0,
      riskStudents: Number(kpis?.risk_students ?? 0),
    },
    admissionTrend,
    charts: {
      placementByDept,
      riskDistribution: {
        LOW: Number(riskDist?.low ?? 0),
        MEDIUM: Number(riskDist?.medium ?? 0),
        HIGH: Number(riskDist?.high ?? 0),
      },
      admissionToPlacementFunnel: {
        admitted: Number(funnel?.admitted ?? 0),
        applied: Number(funnel?.applied ?? 0),
        selected: Number(funnel?.selected ?? 0),
      },
    },
    topRecommendations: recs,
  });
});
