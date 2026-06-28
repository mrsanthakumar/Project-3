import { handle, noContent, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

/** Remove a single eligibility rule from a drive. */
export const DELETE = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "drive.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const row = await queryOne<{ id: string }>(
    `DELETE FROM recruitment_criteria
      WHERE id = $1 AND drive_id = $2 AND institution_id = $3 RETURNING id`,
    [params!.cid, params!.id, institutionId],
  );
  if (!row) throw new ApiError("NOT_FOUND", "Criterion not found");
  return noContent();
});
