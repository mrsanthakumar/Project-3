import { query } from "@/lib/db";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "UPLOAD"
  | "DOWNLOAD"
  | "EXPORT";

interface AuditInput {
  institutionId: string | null;
  userId: string | null;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  detail?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only audit write (Module 19). Never throws into the request path —
 * a logging failure must not break the user action.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
         (institution_id, user_id, action, entity, entity_id, detail, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.institutionId,
        input.userId,
        input.action,
        input.entity ?? null,
        input.entityId ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
        input.ip ?? null,
        input.userAgent ?? null,
      ],
    );
  } catch (e) {
    console.error("audit write failed:", e);
  }
}

export function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}
