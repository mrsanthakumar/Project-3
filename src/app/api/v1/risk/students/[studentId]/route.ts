import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

/** Latest risk score + factor explanation for one student. */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "risk.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const row = await queryOne(
    `SELECT ra.student_id, s.register_number, s.name,
            ra.risk_level, ra.risk_score, ra.factors, ra.assessed_at
       FROM risk_assessments ra
       JOIN students s ON s.id = ra.student_id
      WHERE ra.student_id = $1 AND ra.institution_id = $2
      ORDER BY ra.assessed_at DESC LIMIT 1`,
    [params!.studentId, institutionId],
  );
  if (!row) throw new ApiError("NOT_FOUND", "No risk assessment found — run /risk/assess first");

  return ok({
    studentId: row.student_id,
    registerNumber: row.register_number,
    name: row.name,
    riskLevel: row.risk_level,
    riskScore: Number(row.risk_score),
    factors: row.factors ?? [],
    assessedAt: row.assessed_at,
  });
});
