import { z } from "zod";
import { handle, ok, noContent, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const updateSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
}).partial();

export const PUT = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "user.update");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = updateSchema.parse(await req.json());

  const map: Record<string, string> = {
    fullName: "full_name", roleId: "role_id", departmentId: "department_id",
    phone: "phone", isActive: "is_active",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, col] of Object.entries(map)) {
    if (k in body) { sets.push(`${col} = $${i++}`); vals.push((body as Record<string, unknown>)[k]); }
  }
  if (!sets.length) throw new ApiError("VALIDATION_ERROR", "No fields to update");
  vals.push(params!.id, institutionId);

  const row = await queryOne<{ id: string }>(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${i++} AND institution_id = $${i} AND deleted_at IS NULL RETURNING id`,
    vals,
  );
  if (!row) throw new ApiError("NOT_FOUND", "User not found");

  await recordAudit({ institutionId, userId: ctx.userId, action: "UPDATE", entity: "users", entityId: params!.id, detail: body, ip: clientIp(req) });
  return ok({ id: row.id });
});

export const DELETE = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "user.delete");
  const institutionId = resolveInstitutionScope(ctx, req);

  const row = await queryOne<{ id: string }>(
    `UPDATE users SET deleted_at = now() WHERE id = $1 AND institution_id = $2 AND deleted_at IS NULL RETURNING id`,
    [params!.id, institutionId],
  );
  if (!row) throw new ApiError("NOT_FOUND", "User not found");

  await recordAudit({ institutionId, userId: ctx.userId, action: "DELETE", entity: "users", entityId: params!.id, ip: clientIp(req) });
  return noContent();
});
