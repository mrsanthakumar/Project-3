import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, withTransaction } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

/** Get the permission codes granted to a role. */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "role.manage");
  const rows = await query<{ code: string }>(
    `SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1`,
    [params!.id],
  );
  return ok({ permissionCodes: rows.map((r) => r.code) });
});

const schema = z.object({ permissionCodes: z.array(z.string()) });

/** Replace a role's permission grants (Permission Management, Module 1). */
export const PUT = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "role.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [params!.id]);
    if (body.permissionCodes.length) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, id FROM permissions WHERE code = ANY($2)`,
        [params!.id, body.permissionCodes],
      );
    }
  });

  await recordAudit({ institutionId, userId: ctx.userId, action: "UPDATE", entity: "role_permissions", entityId: params!.id, detail: body, ip: clientIp(req) });
  return ok({ updated: body.permissionCodes.length });
});
