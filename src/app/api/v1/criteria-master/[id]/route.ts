import { handle, noContent, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

/** Soft-disable a tenant criterion (global catalogue items cannot be deleted). */
export const DELETE = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "criteria.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const row = await queryOne<{ id: string }>(
    `UPDATE criteria_master SET is_active = FALSE
      WHERE id = $1 AND institution_id = $2 RETURNING id`,
    [params!.id, institutionId],
  );
  if (!row) throw new ApiError("NOT_FOUND", "Custom criterion not found (global items are read-only)");

  await recordAudit({
    institutionId, userId: ctx.userId, action: "DELETE",
    entity: "criteria_master", entityId: params!.id, ip: clientIp(req),
  });
  return noContent();
});
