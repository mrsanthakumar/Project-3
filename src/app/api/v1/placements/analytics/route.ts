import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Placement analytics (Module 11): placement %, highest/average package,
 * recruiter analysis, department-wise placement, and the applied→attended→
 * selected funnel. Placement % = distinct selected students / active students.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "placement.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const dept = url.searchParams.get("filter[department_id]");
  const batch = url.searchParams.get("filter[batch_id]");
  const studentScope: string[] = ["st.institution_id = $1", "st.deleted_at IS NULL", "st.status = 'ACTIVE'"];
  const args: unknown[] = [institutionId];
  if (dept) { args.push(dept); studentScope.push(`st.department_id = $${args.length}`); }
  if (batch) { args.push(batch); studentScope.push(`st.batch_id = $${args.length}`); }
  const scope = studentScope.join(" AND ");

  const [totals, pkg, recruiter, deptWise, funnel] = await Promise.all([
    queryOne<{ total: number; placed: number }>(
      `SELECT
         (SELECT count(*) FROM students st WHERE ${scope})::int AS total,
         (SELECT count(DISTINCT p.student_id) FROM placements p
            JOIN students st ON st.id = p.student_id
           WHERE p.selected = TRUE AND ${scope})::int AS placed`,
      args,
    ),
    queryOne<{ highest: string; average: string }>(
      `SELECT max(p.package_lpa) AS highest, round(avg(p.package_lpa), 2) AS average
         FROM placements p JOIN students st ON st.id = p.student_id
        WHERE p.selected = TRUE AND ${scope}`,
      args,
    ),
    query(
      `SELECT c.name AS company, count(*) FILTER (WHERE p.selected)::int AS selected,
              round(avg(p.package_lpa) FILTER (WHERE p.selected), 2) AS avg_lpa
         FROM placements p
         JOIN companies c ON c.id = p.company_id
         JOIN students st ON st.id = p.student_id
        WHERE ${scope}
        GROUP BY c.name ORDER BY selected DESC`,
      args,
    ),
    query(
      `SELECT d.code AS department,
              count(DISTINCT st.id)::int AS total,
              count(DISTINCT p.student_id) FILTER (WHERE p.selected)::int AS placed,
              round(100.0 * count(DISTINCT p.student_id) FILTER (WHERE p.selected)
                    / NULLIF(count(DISTINCT st.id),0), 2) AS placed_pct
         FROM students st
         JOIN departments d ON d.id = st.department_id
         LEFT JOIN placements p ON p.student_id = st.id
        WHERE ${scope}
        GROUP BY d.code ORDER BY placed_pct DESC NULLS LAST`,
      args,
    ),
    queryOne<{ applied: number; attended: number; selected: number }>(
      `SELECT
         count(*) FILTER (WHERE p.applied)::int  AS applied,
         count(*) FILTER (WHERE p.attended)::int AS attended,
         count(*) FILTER (WHERE p.selected)::int AS selected
       FROM placements p JOIN students st ON st.id = p.student_id
       WHERE ${scope}`,
      args,
    ),
  ]);

  const total = Number(totals?.total ?? 0);
  const placed = Number(totals?.placed ?? 0);

  return ok({
    placementPercentage: total ? Math.round((placed / total) * 10000) / 100 : 0,
    highestPackageLpa: pkg?.highest ? Number(pkg.highest) : 0,
    averagePackageLpa: pkg?.average ? Number(pkg.average) : 0,
    recruiterAnalysis: recruiter,
    departmentWise: deptWise,
    funnel: {
      applied: Number(funnel?.applied ?? 0),
      attended: Number(funnel?.attended ?? 0),
      selected: Number(funnel?.selected ?? 0),
    },
  });
});
