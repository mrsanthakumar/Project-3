import { z } from "zod";
import { handle, ok, created } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { parseListParams } from "@/lib/query";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const createSchema = z.object({
  fullName: z.string().min(1).max(160),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  phone: z.string().max(20).optional(),
});

/** List users (with role + department). */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "user.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { filters, search, page, pageSize } = parseListParams(req);

  const where: string[] = ["u.institution_id = $1", "u.deleted_at IS NULL"];
  const args: unknown[] = [institutionId];
  if (filters.role_id) { args.push(filters.role_id); where.push(`u.role_id = $${args.length}`); }
  if (search) { args.push(`%${search}%`); where.push(`(u.full_name ILIKE $${args.length} OR u.email ILIKE $${args.length})`); }
  const whereSql = where.join(" AND ");

  const totalRow = await queryOne<{ count: number }>(`SELECT count(*)::int AS count FROM users u WHERE ${whereSql}`, args);
  const total = Number(totalRow?.count ?? 0);

  const rows = await query(
    `SELECT u.id, u.full_name AS "fullName", u.email, u.phone, u.is_active AS "isActive",
            r.name AS "roleName", r.slug AS "roleSlug", d.code AS "departmentCode"
       FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN departments d ON d.id = u.department_id
      WHERE ${whereSql} ORDER BY u.full_name LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, (page - 1) * pageSize],
  );
  return ok(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 });
});

/** Create a user with a hashed password. */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "user.create");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = createSchema.parse(await req.json());

  const hash = await hashPassword(body.password);
  let row: { id: string } | null;
  try {
    row = await queryOne<{ id: string }>(
      `INSERT INTO users (institution_id, role_id, department_id, full_name, email, phone, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [institutionId, body.roleId, body.departmentId ?? null, body.fullName, body.email, body.phone ?? null, hash],
    );
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new (await import("@/lib/http")).ApiError("CONFLICT", "Email already in use");
    throw e;
  }

  await recordAudit({ institutionId, userId: ctx.userId, action: "CREATE", entity: "users", entityId: row!.id, ip: clientIp(req) });
  return created({ id: row!.id });
});
