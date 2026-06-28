import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { parseListParams } from "@/lib/query";

export const runtime = "nodejs";

/**
 * Return the computed eligibility list for a drive, with per-student failure
 * explanations. Filter ?filter[eligible]=true to show only eligible students.
 */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "placement.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { filters, page, pageSize } = parseListParams(req);

  const where: string[] = ["des.drive_id = $1", "des.institution_id = $2"];
  const args: unknown[] = [params!.id, institutionId];
  if (filters.eligible !== undefined) {
    args.push(filters.eligible === "true");
    where.push(`des.is_eligible = $${args.length}`);
  }
  const whereSql = where.join(" AND ");

  const totalRow = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM drive_eligible_students des WHERE ${whereSql}`,
    args,
  );
  const total = Number(totalRow?.count ?? 0);

  const offset = (page - 1) * pageSize;
  const rows = await query(
    `SELECT s.id AS student_id, s.register_number, s.name,
            des.is_eligible, des.failed_criteria, des.computed_at
       FROM drive_eligible_students des
       JOIN students s ON s.id = des.student_id
      WHERE ${whereSql}
      ORDER BY des.is_eligible DESC, s.register_number ASC
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, offset],
  );

  const eligibleCount = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM drive_eligible_students
      WHERE drive_id = $1 AND institution_id = $2 AND is_eligible = TRUE`,
    [params!.id, institutionId],
  );

  return ok(
    {
      driveId: params!.id,
      eligible: Number(eligibleCount?.count ?? 0),
      students: rows.map((r) => ({
        studentId: r.student_id,
        registerNumber: r.register_number,
        name: r.name,
        isEligible: r.is_eligible,
        failedCriteria: r.failed_criteria ?? [],
      })),
    },
    { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
  );
});
