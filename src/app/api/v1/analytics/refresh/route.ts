import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { refreshUnifiedProfiles } from "@/lib/analytics/unified";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ studentId: z.string().uuid().optional() }).optional();

/** Rebuild unified_student_profiles for the tenant (or a single student). */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "analytics.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const body = schema.parse(await req.json().catch(() => ({})));
  const result = await refreshUnifiedProfiles(institutionId, body?.studentId);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE", entity: "unified_student_profiles",
    detail: result, ip: clientIp(req),
  });

  return ok(result);
});
