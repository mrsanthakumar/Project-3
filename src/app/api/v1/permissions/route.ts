import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/** Full permission catalogue, grouped by module for the role editor. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "role.manage");
  const rows = await query<{ code: string; module: string; action: string }>(
    `SELECT code, module, action FROM permissions ORDER BY module, action`,
  );
  return ok(rows);
});
