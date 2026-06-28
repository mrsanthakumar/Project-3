import { query, queryOne } from "@/lib/db";

export interface UserRow {
  id: string;
  institution_id: string | null;
  role_id: string;
  department_id: string | null;
  full_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  role_slug: string;
}

/**
 * Look up a user by email, optionally scoped to an institution code.
 * Joins the role to expose role_slug for the JWT.
 */
export async function findUserForLogin(
  email: string,
  institutionCode?: string,
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT u.id, u.institution_id, u.role_id, u.department_id, u.full_name,
            u.email, u.password_hash, u.is_active, r.slug AS role_slug
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN institutions i ON i.id = u.institution_id
      WHERE lower(u.email) = lower($1)
        AND u.deleted_at IS NULL
        AND ($2::text IS NULL OR i.code = $2)
      LIMIT 1`,
    [email, institutionCode ?? null],
  );
}

/** All permission codes granted to a user via their role. */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const rows = await query<{ code: string }>(
    `SELECT p.code
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = $1`,
    [userId],
  );
  return rows.map((r) => r.code);
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT u.id, u.institution_id, u.role_id, u.department_id, u.full_name,
            u.email, u.password_hash, u.is_active, r.slug AS role_slug
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId],
  );
}

export async function touchLastLogin(userId: string): Promise<void> {
  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
}
