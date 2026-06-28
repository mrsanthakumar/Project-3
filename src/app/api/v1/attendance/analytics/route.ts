import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Attendance analytics (Module 6): overall %, monthly trend, subject-wise and
 * department-wise breakdown. Attendance % counts PRESENT and OD as attended.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "attendance.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const dept = url.searchParams.get("filter[department_id]");
  const deptJoin = dept ? "AND st.department_id = $2" : "";
  const args: unknown[] = dept ? [institutionId, dept] : [institutionId];

  const attended = `SUM(CASE WHEN a.status IN ('PRESENT','OD') THEN 1 ELSE 0 END)::numeric`;
  const pct = `round(100.0 * ${attended} / NULLIF(count(*),0), 2)`;

  const [overall, monthly, subjectWise, departmentWise] = await Promise.all([
    query<{ pct: string }>(
      `SELECT ${pct} AS pct FROM attendance a
         JOIN students st ON st.id = a.student_id
        WHERE a.institution_id = $1 ${deptJoin}`,
      args,
    ),
    query(
      `SELECT to_char(a.attendance_date,'YYYY-MM') AS month, ${pct} AS pct
         FROM attendance a JOIN students st ON st.id = a.student_id
        WHERE a.institution_id = $1 ${deptJoin}
        GROUP BY month ORDER BY month`,
      args,
    ),
    query(
      `SELECT sub.code AS subject_code, sub.name AS subject_name, ${pct} AS pct
         FROM attendance a
         JOIN students st ON st.id = a.student_id
         JOIN subjects sub ON sub.id = a.subject_id
        WHERE a.institution_id = $1 ${deptJoin}
        GROUP BY sub.code, sub.name ORDER BY pct ASC`,
      args,
    ),
    query(
      `SELECT d.code AS department, ${pct} AS pct
         FROM attendance a
         JOIN students st ON st.id = a.student_id
         JOIN departments d ON d.id = st.department_id
        WHERE a.institution_id = $1 ${deptJoin}
        GROUP BY d.code ORDER BY d.code`,
      args,
    ),
  ]);

  return ok({
    overallPct: Number(overall[0]?.pct ?? 0),
    monthly,
    subjectWise,
    departmentWise,
  });
});
