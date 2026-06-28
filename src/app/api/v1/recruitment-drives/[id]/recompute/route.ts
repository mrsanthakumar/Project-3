import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { recomputeDriveEligibility } from "@/lib/eligibility/engine";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

/** Run the eligibility engine for a drive and persist the results. */
export const POST = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "drive.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const summary = await recomputeDriveEligibility(params!.id, institutionId);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE", entity: "drive_eligibility",
    entityId: params!.id, detail: summary, ip: clientIp(req),
  });

  return ok(summary);
});
