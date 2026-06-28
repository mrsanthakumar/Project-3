import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { parseListParams } from "@/lib/query";

export const runtime = "nodejs";

/** List saved statistical reports for the tenant. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "stats.run");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { filters, page, pageSize } = parseListParams(req);

  const where: string[] = ["institution_id = $1"];
  const args: unknown[] = [institutionId];
  if (filters.test_type) { args.push(filters.test_type); where.push(`test_type = $${args.length}`); }
  const whereSql = where.join(" AND ");

  const totalRow = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM statistical_reports WHERE ${whereSql}`,
    args,
  );
  const total = Number(totalRow?.count ?? 0);

  const rows = await query(
    `SELECT id, test_type, variables, statistic, p_value, effect_size, sample_size,
            interpretation, generated_at
       FROM statistical_reports WHERE ${whereSql}
      ORDER BY generated_at DESC
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, (page - 1) * pageSize],
  );

  return ok(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 });
});
