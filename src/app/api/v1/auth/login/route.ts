import { handle, ok, ApiError } from "@/lib/http";
import { loginSchema } from "@/lib/validators/auth";
import { findUserForLogin, getUserPermissions, touchLastLogin } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken } from "@/lib/auth/jwt";
import { createSession, setRefreshCookie } from "@/lib/auth/session";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const body = loginSchema.parse(await req.json());

  const user = await findUserForLogin(body.email, body.institutionCode);
  // Always run a comparison shape to limit user-enumeration timing leaks.
  const valid = user ? await verifyPassword(body.password, user.password_hash) : false;

  if (!user || !valid) {
    throw new ApiError("UNAUTHENTICATED", "Invalid email or password" );
  }
  if (!user.is_active) {
    throw new ApiError("FORBIDDEN", "Account is disabled");
  }

  const permissions = await getUserPermissions(user.id);

  const accessToken = await signAccessToken({
    sub: user.id,
    iid: user.institution_id,
    role: user.role_slug,
    perms: permissions,
    dept: user.department_id,
  });

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const refresh = await createSession(user.id, { ip: ip ?? undefined, userAgent });
  await setRefreshCookie(refresh);
  await touchLastLogin(user.id);

  await recordAudit({
    institutionId: user.institution_id,
    userId: user.id,
    action: "LOGIN",
    ip,
    userAgent,
  });

  return ok({
    accessToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role_slug,
      institutionId: user.institution_id,
      permissions,
    },
  });
});
