import { createHash } from "crypto";
import { handle, ok, ApiError } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { hashPassword } from "@/lib/auth/password";
import { query, queryOne } from "@/lib/db";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const body = resetPasswordSchema.parse(await req.json());
  const hash = createHash("sha256").update(body.token).digest("hex");

  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users
      WHERE password_reset_token = $1
        AND password_reset_expires_at > now()
        AND deleted_at IS NULL`,
    [hash],
  );
  if (!user) throw new ApiError("UNPROCESSABLE", "Invalid or expired reset token");

  const newHash = await hashPassword(body.newPassword);
  await query(
    `UPDATE users
        SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL
      WHERE id = $2`,
    [newHash, user.id],
  );
  // Revoke all sessions so old refresh tokens can't be reused.
  await query(`UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1`, [user.id]);

  return ok({ success: true });
});
