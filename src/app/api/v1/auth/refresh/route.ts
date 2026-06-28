import { handle, ok, ApiError } from "@/lib/http";
import { getUserById, getUserPermissions } from "@/lib/auth/users";
import { signAccessToken } from "@/lib/auth/jwt";
import { readRefreshCookie, rotateSession, setRefreshCookie } from "@/lib/auth/session";
import { clientIp } from "@/lib/audit";

export const runtime = "nodejs";

/** Rotate refresh token + mint a new access token from the httpOnly cookie. */
export const POST = handle(async (req) => {
  const current = await readRefreshCookie();
  if (!current) throw new ApiError("UNAUTHENTICATED", "No active session");

  const { resolveSession } = await import("@/lib/auth/session");
  const session = await resolveSession(current);
  if (!session) throw new ApiError("UNAUTHENTICATED", "Session expired");

  const user = await getUserById(session.userId);
  if (!user || !user.is_active) throw new ApiError("FORBIDDEN", "Account unavailable");

  const ip = clientIp(req) ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const rotated = await rotateSession(current, user.id, { ip, userAgent });
  if (!rotated) throw new ApiError("UNAUTHENTICATED", "Session expired");
  await setRefreshCookie(rotated);

  const permissions = await getUserPermissions(user.id);
  const accessToken = await signAccessToken({
    sub: user.id,
    iid: user.institution_id,
    role: user.role_slug,
    perms: permissions,
    dept: user.department_id,
  });

  return ok({ accessToken });
});
