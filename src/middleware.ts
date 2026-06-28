import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

/**
 * Runs on the Edge for every /api/v1 request. Verifies the access token once
 * and forwards the claims as x-auth-* headers to route handlers (see
 * src/lib/auth/context.ts). Public auth routes are skipped.
 */
const PUBLIC_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return unauthorized();
  }

  try {
    const claims = await verifyAccessToken(auth.slice(7));
    const headers = new Headers(req.headers);
    headers.set("x-auth-user", claims.sub);
    headers.set("x-auth-role", claims.role);
    headers.set("x-auth-institution", claims.iid ?? "");
    headers.set("x-auth-perms", (claims.perms ?? []).join(","));
    headers.set("x-auth-dept", claims.dept ?? "");
    return NextResponse.next({ request: { headers } });
  } catch {
    return unauthorized();
  }
}

function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
