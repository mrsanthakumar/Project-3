import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { parseListParams } from "@/lib/query";

export const runtime = "nodejs";

/** List generated recommendations. Filter by scope_level / status / priority. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "recommendation.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { filters, page, pageSize } = parseListParams(req);

  const where: string[] = ["r.institution_id = $1"];
  const args: unknown[] = [institutionId];
  for (const [key, col] of [["scope_level", "r.scope_level"], ["status", "r.status"]] as const) {
    if (filters[key]) { args.push(filters[key]); where.push(`${col} = $${args.length}`); }
  }
  const whereSql = where.join(" AND ");

  const totalRow = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM recommendations r WHERE ${whereSql}`,
    args,
  );
  const total = Number(totalRow?.count ?? 0);

  const rows = await query(
    `SELECT r.id, r.scope_level, r.action_text, r.priority, r.status, r.rationale, r.generated_at,
            s.register_number, s.name AS student_name, d.code AS department_code
       FROM recommendations r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN departments d ON d.id = r.department_id
      WHERE ${whereSql}
      ORDER BY r.priority ASC, r.generated_at DESC
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, (page - 1) * pageSize],
  );

  return ok(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 });
});
