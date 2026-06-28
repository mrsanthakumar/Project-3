import { z } from "zod";
import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne, withTransaction } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const COMPARATORS = ["GTE", "LTE", "GT", "LT", "EQ", "NEQ"] as const;

const putSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  rules: z
    .array(
      z.object({
        category: z.string().min(1).max(40),
        metric: z.string().min(1).max(60),
        comparator: z.enum(COMPARATORS),
        threshold: z.number(),
        weight: z.number().min(0).max(100),
        message: z.string().optional(),
      }),
    )
    .min(1),
  bands: z
    .array(
      z.object({
        level: z.enum(["LOW", "MEDIUM", "HIGH"]),
        minScore: z.number().min(0),
        maxScore: z.number().min(0),
      }),
    )
    .length(3),
});

async function activeRuleSet(institutionId: string) {
  return queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM risk_rule_sets WHERE institution_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [institutionId],
  );
}

/** Read the active risk model: rule set + rules + bands. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "risk.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const ruleSet = await activeRuleSet(institutionId);
  if (!ruleSet) return ok({ ruleSet: null, rules: [], bands: [] });

  const [rules, bands] = await Promise.all([
    query(
      `SELECT category, metric, comparator, threshold_num AS threshold, weight, message_template AS message
         FROM risk_rules WHERE rule_set_id = $1 ORDER BY category`,
      [ruleSet.id],
    ),
    query(
      `SELECT level, min_score AS "minScore", max_score AS "maxScore"
         FROM risk_bands WHERE rule_set_id = $1 ORDER BY min_score`,
      [ruleSet.id],
    ),
  ]);
  return ok({ ruleSet, rules, bands });
});

/** Replace the rules + bands of the active model (configurable, not code). */
export const PUT = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "risk.configure");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = putSchema.parse(await req.json());

  await withTransaction(async (client) => {
    let ruleSet = await activeRuleSet(institutionId);
    if (!ruleSet) {
      const { rows } = await client.query<{ id: string; name: string }>(
        `INSERT INTO risk_rule_sets (institution_id, name) VALUES ($1, $2) RETURNING id, name`,
        [institutionId, body.name ?? "Default Risk Model"],
      );
      ruleSet = rows[0];
    } else if (body.name) {
      await client.query(`UPDATE risk_rule_sets SET name = $2 WHERE id = $1`, [ruleSet.id, body.name]);
    }

    await client.query(`DELETE FROM risk_rules WHERE rule_set_id = $1`, [ruleSet.id]);
    await client.query(`DELETE FROM risk_bands WHERE rule_set_id = $1`, [ruleSet.id]);

    for (const r of body.rules) {
      await client.query(
        `INSERT INTO risk_rules
           (institution_id, rule_set_id, category, metric, comparator, threshold_num, weight, message_template)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [institutionId, ruleSet.id, r.category, r.metric, r.comparator, r.threshold, r.weight, r.message ?? null],
      );
    }
    for (const b of body.bands) {
      await client.query(
        `INSERT INTO risk_bands (institution_id, rule_set_id, level, min_score, max_score)
         VALUES ($1,$2,$3,$4,$5)`,
        [institutionId, ruleSet.id, b.level, b.minScore, b.maxScore],
      );
    }
  });

  if (body.bands.length !== new Set(body.bands.map((b) => b.level)).size) {
    throw new ApiError("VALIDATION_ERROR", "Bands must cover LOW, MEDIUM, HIGH once each");
  }

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE", entity: "risk_config",
    detail: { rules: body.rules.length }, ip: clientIp(req),
  });
  return ok({ success: true });
});
