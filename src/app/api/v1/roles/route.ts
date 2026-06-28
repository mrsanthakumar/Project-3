import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/** List roles available to the tenant (global + tenant-scoped). */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "role.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const rows = await query(
    `SELECT id, name, slug, is_system AS "isSystem"
       FROM roles WHERE institution_id IS NULL OR institution_id = $1 ORDER BY name`,
    [institutionId],
  );
  return ok(rows);
});
