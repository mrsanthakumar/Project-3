import { query, queryOne, withTransaction } from "@/lib/db";
import { ApiError } from "@/lib/http";

/**
 * Risk Prediction Engine (Module 14). Fully configurable — thresholds, weights,
 * and score→level bands all live in risk_rules / risk_bands, never in code.
 *
 * score   = Σ weight of every rule whose at-risk condition is TRUE
 * level   = band whose [min,max] contains the score
 * factors = the triggered rules with a templated explanation
 *
 * Results are written to risk_assessments and denormalised onto
 * unified_student_profiles (risk_level / risk_score).
 */

interface RuleRow {
  category: string;
  metric: string;
  comparator: string;
  threshold_num: string | null;
  weight: string;
  message_template: string | null;
}
interface BandRow {
  level: "LOW" | "MEDIUM" | "HIGH";
  min_score: string;
  max_score: string;
}

export function triggered(value: number | null, comparator: string, threshold: number): boolean {
  if (value === null) return false;
  switch (comparator) {
    case "LT": return value < threshold;
    case "LTE": return value <= threshold;
    case "GT": return value > threshold;
    case "GTE": return value >= threshold;
    case "EQ": return value === threshold;
    case "NEQ": return value !== threshold;
    default: return false;
  }
}

export function bandFor(score: number, bands: BandRow[]): "LOW" | "MEDIUM" | "HIGH" {
  for (const b of bands) {
    if (score >= Number(b.min_score) && score <= Number(b.max_score)) return b.level;
  }
  return "LOW";
}

function fillTemplate(tpl: string | null, value: number | null, threshold: number): string {
  if (!tpl) return "";
  return tpl.replace("{value}", String(value ?? "n/a")).replace("{threshold}", String(threshold));
}

export interface RiskSummary {
  ruleSetId: string;
  assessed: number;
  high: number;
  medium: number;
  low: number;
}

export async function assessRisk(
  institutionId: string,
  studentId?: string,
): Promise<RiskSummary> {
  const ruleSet = await queryOne<{ id: string }>(
    `SELECT id FROM risk_rule_sets
      WHERE institution_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC LIMIT 1`,
    [institutionId],
  );
  if (!ruleSet) throw new ApiError("UNPROCESSABLE", "No active risk model — configure one first");

  const [rules, bands] = await Promise.all([
    query<RuleRow>(
      `SELECT category, metric, comparator, threshold_num, weight, message_template
         FROM risk_rules WHERE rule_set_id = $1`,
      [ruleSet.id],
    ),
    query<BandRow>(
      `SELECT level, min_score, max_score FROM risk_bands WHERE rule_set_id = $1`,
      [ruleSet.id],
    ),
  ]);

  const scope = studentId ? "AND student_id = $2" : "";
  const args: unknown[] = studentId ? [institutionId, studentId] : [institutionId];
  const students = await query<Record<string, unknown>>(
    `SELECT * FROM unified_student_profiles WHERE institution_id = $1 ${scope}`,
    args,
  );

  const counts = { high: 0, medium: 0, low: 0 };

  await withTransaction(async (client) => {
    for (const st of students) {
      let score = 0;
      const factors: unknown[] = [];

      for (const r of rules) {
        const value = st[r.metric] != null ? Number(st[r.metric]) : null;
        const threshold = r.threshold_num != null ? Number(r.threshold_num) : 0;
        if (triggered(value, r.comparator, threshold)) {
          score += Number(r.weight);
          factors.push({
            category: r.category,
            metric: r.metric,
            value,
            threshold,
            weight: Number(r.weight),
            message: fillTemplate(r.message_template, value, threshold),
          });
        }
      }

      const level = bandFor(score, bands);
      counts[level.toLowerCase() as "high" | "medium" | "low"]++;

      await client.query(
        `INSERT INTO risk_assessments
           (institution_id, student_id, rule_set_id, risk_level, risk_score, factors)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [institutionId, st.student_id, ruleSet.id, level, score, JSON.stringify(factors)],
      );
      await client.query(
        `UPDATE unified_student_profiles
            SET risk_level = $2, risk_score = $3 WHERE student_id = $1`,
        [st.student_id, level, score],
      );
    }
  });

  return {
    ruleSetId: ruleSet.id,
    assessed: students.length,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
  };
}
