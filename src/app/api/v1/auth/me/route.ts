import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext } from "@/lib/auth/context";
import { getUserById, getUserPermissions } from "@/lib/auth/users";

export const runtime = "nodejs";

export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  const user = await getUserById(ctx.userId);
  if (!user) throw new ApiError("NOT_FOUND", "User not found");

  const permissions = await getUserPermissions(user.id);
  return ok({
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_slug,
    institutionId: user.institution_id,
    departmentId: user.department_id,
    permissions,
  });
});
