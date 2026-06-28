import { z } from "zod";
import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "DISMISSED"]) });

/** Update a recommendation's workflow status. */
export const PATCH = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "recommendation.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());

  const row = await queryOne<{ id: string }>(
    `UPDATE recommendations SET status = $1
      WHERE id = $2 AND institution_id = $3 RETURNING id`,
    [body.status, params!.id, institutionId],
  );
  if (!row) throw new ApiError("NOT_FOUND", "Recommendation not found");

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE", entity: "recommendation",
    entityId: params!.id, detail: body, ip: clientIp(req),
  });
  return ok({ id: row.id, status: body.status });
});
