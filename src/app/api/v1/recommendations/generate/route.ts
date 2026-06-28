import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { generateRecommendations } from "@/lib/recommendation/engine";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

/** Evaluate all active recommendation rules and (re)generate recommendations. */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "recommendation.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const summary = await generateRecommendations(institutionId);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE", entity: "recommendations",
    detail: summary, ip: clientIp(req),
  });
  return ok(summary);
});
