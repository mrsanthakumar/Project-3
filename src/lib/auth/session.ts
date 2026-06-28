import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Opaque refresh tokens. We store only the SHA-256 hash in user_sessions,
 * so a DB leak cannot be replayed. The raw token lives only in an httpOnly
 * cookie on the client.
 */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string; ip?: string },
): Promise<string> {
  const raw = randomBytes(48).toString("base64url");
  const expires = new Date(Date.now() + env.refreshTtlDays * 86_400_000);
  await query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, sha256(raw), meta.userAgent ?? null, meta.ip ?? null, expires],
  );
  return raw;
}

/** Validate a refresh token; returns the user_id if the session is live. */
export async function resolveSession(raw: string): Promise<{ id: string; userId: string } | null> {
  const row = await queryOne<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM user_sessions
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [sha256(raw)],
  );
  return row ? { id: row.id, userId: row.user_id } : null;
}

/** Rotate: revoke the old session row and mint a fresh one. */
export async function rotateSession(
  oldRaw: string,
  userId: string,
  meta: { userAgent?: string; ip?: string },
): Promise<string | null> {
  const session = await resolveSession(oldRaw);
  if (!session) return null;
  await query(`UPDATE user_sessions SET revoked_at = now() WHERE id = $1`, [session.id]);
  return createSession(userId, meta);
}

export async function revokeSession(raw: string): Promise<void> {
  await query(
    `UPDATE user_sessions SET revoked_at = now() WHERE refresh_token_hash = $1`,
    [sha256(raw)],
  );
}

const cookieBase = {
  httpOnly: true as const,
  secure: env.isProd,
  sameSite: "strict" as const,
  path: "/",
};

export async function setRefreshCookie(raw: string) {
  (await cookies()).set(env.refreshCookieName, raw, {
    ...cookieBase,
    maxAge: env.refreshTtlDays * 86_400,
  });
}

export async function clearRefreshCookie() {
  (await cookies()).set(env.refreshCookieName, "", { ...cookieBase, maxAge: 0 });
}

export async function readRefreshCookie(): Promise<string | null> {
  return (await cookies()).get(env.refreshCookieName)?.value ?? null;
}
