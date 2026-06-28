import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext } from "@/lib/auth/context";
import { changePasswordSchema } from "@/lib/validators/auth";
import { getUserById } from "@/lib/auth/users";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  const body = changePasswordSchema.parse(await req.json());

  const user = await getUserById(ctx.userId);
  if (!user) throw new ApiError("NOT_FOUND", "User not found");

  const valid = await verifyPassword(body.currentPassword, user.password_hash);
  if (!valid) throw new ApiError("UNPROCESSABLE", "Current password is incorrect");

  const hash = await hashPassword(body.newPassword);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, user.id]);

  // Invalidate all other sessions after a password change.
  await query(
    `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [user.id],
  );

  await recordAudit({
    institutionId: ctx.institutionId,
    userId: ctx.userId,
    action: "UPDATE",
    entity: "users",
    entityId: user.id,
    detail: { field: "password" },
    ip: clientIp(req),
  });

  return ok({ success: true });
});
