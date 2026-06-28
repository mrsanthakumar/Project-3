import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { parseListParams } from "@/lib/query";

export const runtime = "nodejs";

/** List students by risk, from the unified profile. ?filter[risk_level]=HIGH */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "risk.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { filters, page, pageSize } = parseListParams(req);

  const where: string[] = ["u.institution_id = $1"];
  const args: unknown[] = [institutionId];
  if (filters.risk_level) { args.push(filters.risk_level); where.push(`u.risk_level = $${args.length}`); }
  if (filters.department_id) { args.push(filters.department_id); where.push(`u.department_id = $${args.length}`); }
  const whereSql = where.join(" AND ");

  const totalRow = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM unified_student_profiles u WHERE ${whereSql}`,
    args,
  );
  const total = Number(totalRow?.count ?? 0);

  const rows = await query(
    `SELECT s.id AS student_id, s.register_number, s.name,
            u.risk_level, u.risk_score, u.current_cgpa, u.avg_attendance_pct, u.active_arrears
       FROM unified_student_profiles u
       JOIN students s ON s.id = u.student_id
      WHERE ${whereSql}
      ORDER BY u.risk_score DESC NULLS LAST
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, (page - 1) * pageSize],
  );

  return ok(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 });
});
