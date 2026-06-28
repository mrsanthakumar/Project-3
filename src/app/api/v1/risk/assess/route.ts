import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { assessRisk } from "@/lib/risk/engine";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ studentId: z.string().uuid().optional() }).optional();

/** Run the risk model over the tenant (or one student) and persist results. */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "risk.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json().catch(() => ({})));

  const summary = await assessRisk(institutionId, body?.studentId);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE", entity: "risk_assessments",
    detail: summary, ip: clientIp(req),
  });
  return ok(summary);
});
