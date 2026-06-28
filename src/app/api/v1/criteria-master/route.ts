import { z } from "zod";
import { handle, ok, created } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const COMPARATORS = ["GTE", "LTE", "GT", "LT", "EQ", "NEQ", "IN", "NOT_IN", "BETWEEN"] as const;

const createSchema = z.object({
  code: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  dataType: z.enum(["NUMERIC", "INTEGER", "BOOLEAN", "STRING", "ENUM"]),
  sourcePath: z.string().min(1).max(120),
  allowedComparators: z.array(z.enum(COMPARATORS)).min(1),
  enumOptions: z.array(z.string()).optional(),
  unit: z.string().max(20).optional(),
});

const toApi = (r: Record<string, unknown>) => ({
  id: r.id,
  code: r.code,
  label: r.label,
  dataType: r.data_type,
  sourcePath: r.source_path,
  allowedComparators: r.allowed_comparators,
  enumOptions: r.enum_options,
  unit: r.unit,
  isActive: r.is_active,
  isGlobal: r.institution_id === null,
});

/** List the eligibility catalogue: global items + this tenant's custom items. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "criteria.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const rows = await query(
    `SELECT * FROM criteria_master
      WHERE is_active = TRUE AND (institution_id IS NULL OR institution_id = $1)
      ORDER BY label ASC`,
    [institutionId],
  );
  return ok(rows.map(toApi));
});

/** Create a tenant-scoped custom criterion (Placement Officer, from the UI). */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "criteria.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = createSchema.parse(await req.json());

  const row = await queryOne(
    `INSERT INTO criteria_master
       (institution_id, code, label, data_type, source_path, allowed_comparators, enum_options, unit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      institutionId, body.code, body.label, body.dataType, body.sourcePath,
      body.allowedComparators, // node-pg serialises a JS string[] to a text/enum[]
      body.enumOptions ? JSON.stringify(body.enumOptions) : null,
      body.unit ?? null,
    ],
  );

  await recordAudit({
    institutionId, userId: ctx.userId, action: "CREATE",
    entity: "criteria_master", entityId: String(row!.id), detail: body, ip: clientIp(req),
  });

  return created(toApi(row!));
});
