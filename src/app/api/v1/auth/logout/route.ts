import { handle, ok } from "@/lib/http";
import { getAuthContext } from "@/lib/auth/context";
import { clearRefreshCookie, readRefreshCookie, revokeSession } from "@/lib/auth/session";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  const current = await readRefreshCookie();
  if (current) await revokeSession(current);
  await clearRefreshCookie();

  await recordAudit({
    institutionId: ctx.institutionId,
    userId: ctx.userId,
    action: "LOGOUT",
    ip: clientIp(req),
  });

  return ok({ success: true });
});
