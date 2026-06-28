import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Audit log reader (Module 19). Keyset-paginated on the BIGSERIAL id (the table
 * is high-volume, so offset pagination would degrade). Filters: user_id,
 * action, entity, from/to (ISO dates). Pass ?after=<id> to page older entries.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "audit.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const q = url.searchParams;
  const limit = Math.min(100, Math.max(1, Number(q.get("limit") ?? 50) || 50));

  const where: string[] = ["institution_id = $1"];
  const args: unknown[] = [institutionId];
  const add = (clause: string, value: unknown) => {
    args.push(value);
    where.push(clause.replace("$$", `$${args.length}`));
  };

  if (q.get("user_id")) add("user_id = $$", q.get("user_id"));
  if (q.get("action")) add("action = $$", q.get("action"));
  if (q.get("entity")) add("entity = $$", q.get("entity"));
  if (q.get("from")) add("created_at >= $$", q.get("from"));
  if (q.get("to")) add("created_at <= $$", q.get("to"));
  if (q.get("after")) add("id < $$", Number(q.get("after")));

  const rows = await query<{ id: string }>(
    `SELECT id, user_id, action, entity, entity_id, detail, ip_address, created_at
       FROM audit_logs WHERE ${where.join(" AND ")}
      ORDER BY id DESC LIMIT $${args.length + 1}`,
    [...args, limit],
  );

  const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
  return ok({ logs: rows, nextCursor });
});
