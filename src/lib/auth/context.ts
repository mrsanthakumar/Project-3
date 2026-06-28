import { ApiError } from "@/lib/http";

/**
 * The authenticated principal for a request. middleware.ts verifies the JWT
 * once and forwards the claims as x-auth-* headers, so route handlers read
 * them here without re-verifying.
 */
export interface AuthContext {
  userId: string;
  institutionId: string | null;
  role: string;
  permissions: string[];
  departmentId: string | null;
  isSuperAdmin: boolean;
}

export function getAuthContext(req: Request): AuthContext {
  const h = req.headers;
  const userId = h.get("x-auth-user");
  if (!userId) throw new ApiError("UNAUTHENTICATED", "Authentication required");

  const role = h.get("x-auth-role") ?? "";
  const institutionId = h.get("x-auth-institution") || null;
  return {
    userId,
    institutionId,
    role,
    permissions: (h.get("x-auth-perms") ?? "").split(",").filter(Boolean),
    departmentId: h.get("x-auth-dept") || null,
    isSuperAdmin: role === "super_admin",
  };
}

/** Throws FORBIDDEN unless the caller holds the permission (super admin bypasses). */
export function requirePermission(ctx: AuthContext, code: string): void {
  if (ctx.isSuperAdmin) return;
  if (!ctx.permissions.includes(code)) {
    throw new ApiError("FORBIDDEN", `Missing permission: ${code}`);
  }
}

/**
 * The institution a query must be scoped to. Super Admin may target a tenant
 * via the X-Institution-Id header; everyone else is locked to their own.
 */
export function resolveInstitutionScope(ctx: AuthContext, req: Request): string {
  if (ctx.isSuperAdmin) {
    const target = req.headers.get("x-institution-id");
    if (!target) throw new ApiError("UNPROCESSABLE", "Super Admin must specify X-Institution-Id");
    return target;
  }
  if (!ctx.institutionId) throw new ApiError("FORBIDDEN", "No institution scope");
  return ctx.institutionId;
}
