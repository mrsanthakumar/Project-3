import { z } from "zod";
import { handle, ok, created, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne, withTransaction } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const COMPARATORS = ["GTE", "LTE", "GT", "LT", "EQ", "NEQ", "IN", "NOT_IN", "BETWEEN"] as const;

const ruleSchema = z.object({
  criteriaCode: z.string().min(1),
  comparator: z.enum(COMPARATORS),
  value: z.union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))]),
});
const bodySchema = z.object({
  criteria: z.array(ruleSchema).min(1),
  matchMode: z.enum(["ALL", "ANY"]).optional(),
});

async function assertDrive(driveId: string, institutionId: string) {
  const drive = await queryOne<{ id: string }>(
    `SELECT id FROM recruitment_drives WHERE id = $1 AND institution_id = $2`,
    [driveId, institutionId],
  );
  if (!drive) throw new ApiError("NOT_FOUND", "Recruitment drive not found");
}

/** List the configured eligibility rules for a drive. */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "placement.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  await assertDrive(params!.id, institutionId);

  const rows = await query(
    `SELECT rc.id, cm.code, cm.label, rc.comparator,
            rc.value_numeric, rc.value_text, rc.value_json
       FROM recruitment_criteria rc
       JOIN criteria_master cm ON cm.id = rc.criteria_id
      WHERE rc.drive_id = $1 ORDER BY cm.label`,
    [params!.id],
  );
  return ok(rows);
});

/**
 * Add eligibility rules to a drive. Each rule references a criteria_master
 * code; the value is stored as numeric / text / json based on its type, so
 * nothing about the rule is hardcoded.
 */
export const POST = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "drive.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const driveId = params!.id;
  await assertDrive(driveId, institutionId);
  const body = bodySchema.parse(await req.json());

  // Resolve criteria codes (global + tenant) → ids.
  const codes = [...new Set(body.criteria.map((c) => c.criteriaCode))];
  const masters = await query<{ id: string; code: string }>(
    `SELECT id, code FROM criteria_master
      WHERE code = ANY($1) AND is_active = TRUE
        AND (institution_id IS NULL OR institution_id = $2)`,
    [codes, institutionId],
  );
  const byCode = new Map(masters.map((m) => [m.code, m.id]));
  const missing = codes.filter((c) => !byCode.has(c));
  if (missing.length) throw new ApiError("UNPROCESSABLE", `Unknown criteria: ${missing.join(", ")}`);

  await withTransaction(async (client) => {
    for (const r of body.criteria) {
      let valNum: number | null = null;
      let valText: string | null = null;
      let valJson: string | null = null;
      if (Array.isArray(r.value)) valJson = JSON.stringify(r.value);
      else if (typeof r.value === "number") valNum = r.value;
      else valText = r.value;

      await client.query(
        `INSERT INTO recruitment_criteria
           (institution_id, drive_id, criteria_id, comparator, value_numeric, value_text, value_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [institutionId, driveId, byCode.get(r.criteriaCode), r.comparator, valNum, valText, valJson],
      );
    }
    if (body.matchMode) {
      await client.query(`UPDATE recruitment_drives SET match_mode = $1 WHERE id = $2`, [
        body.matchMode,
        driveId,
      ]);
    }
  });

  await recordAudit({
    institutionId, userId: ctx.userId, action: "CREATE", entity: "recruitment_criteria",
    entityId: driveId, detail: body, ip: clientIp(req),
  });

  return created({ added: body.criteria.length });
});
