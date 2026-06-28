import { randomBytes, createHash } from "crypto";
import { handle, ok } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { findUserForLogin } from "@/lib/auth/users";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Always returns 200 with the same message regardless of whether the email
 * exists — prevents account enumeration. When a user matches we store a
 * hashed, time-boxed reset token. (Email delivery is wired in the
 * notifications phase; in dev the token is logged server-side.)
 */
export const POST = handle(async (req) => {
  const body = forgotPasswordSchema.parse(await req.json());
  const user = await findUserForLogin(body.email, body.institutionCode);

  if (user) {
    const raw = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(raw).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3`,
      [hash, expires, user.id],
    );
    // TODO(notifications phase): email the raw token link to the user.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] password reset token for ${user.email}: ${raw}`);
    }
  }

  return ok({ message: "If the account exists, a reset link has been sent." });
});
