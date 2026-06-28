import { query, withTransaction } from "@/lib/db";

/**
 * Recommendation Engine (Module 16). Rule-based and fully configurable: each
 * recommendation_rule carries conditions as JSON, combined by ALL/ANY logic,
 * and an action_text. Rules are evaluated at STUDENT, DEPARTMENT, or
 * INSTITUTION scope against metrics derived from the unified read model.
 */

interface Condition {
  metric: string;
  comparator: string;
  value: number;
}
interface RuleRow {
  id: string;
  name: string;
  scope_level: "STUDENT" | "DEPARTMENT" | "INSTITUTION";
  conditions: Condition[];
  logic: "ALL" | "ANY";
  action_text: string;
  priority: number;
}

export function cmp(actual: number | null, comparator: string, value: number): boolean {
  if (actual === null) return false;
  switch (comparator) {
    case "GTE": return actual >= value;
    case "LTE": return actual <= value;
    case "GT": return actual > value;
    case "LT": return actual < value;
    case "EQ": return actual === value;
    case "NEQ": return actual !== value;
    default: return false;
  }
}

function evaluate(metrics: Record<string, number | null>, rule: RuleRow): boolean {
  const results = rule.conditions.map((c) => cmp(metrics[c.metric] ?? null, c.comparator, c.value));
  return rule.logic === "ANY" ? results.some(Boolean) : results.every(Boolean);
}

export interface RecommendationSummary {
  generated: number;
  byScope: Record<string, number>;
}

export async function generateRecommendations(
  institutionId: string,
): Promise<RecommendationSummary> {
  const rules = await query<RuleRow>(
    `SELECT id, name, scope_level, conditions, logic, action_text, priority
       FROM recommendation_rules WHERE institution_id = $1 AND is_active = TRUE`,
    [institutionId],
  );

  const byScope: Record<string, number> = { STUDENT: 0, DEPARTMENT: 0, INSTITUTION: 0 };

  // Department-level metrics (also aggregated for INSTITUTION scope).
  const deptMetrics = await query<{
    department_id: string; total: number; avg_cgpa: number | null;
    avg_attendance: number | null; placement_pct: number | null; high_arrear_ratio: number | null;
  }>(
    `SELECT department_id,
            count(*)::int AS total,
            round(avg(current_cgpa), 2) AS avg_cgpa,
            round(avg(avg_attendance_pct), 2) AS avg_attendance,
            round(100.0 * count(*) FILTER (WHERE is_placed) / NULLIF(count(*),0), 2) AS placement_pct,
            round(1.0 * count(*) FILTER (WHERE active_arrears > 3) / NULLIF(count(*),0), 3) AS high_arrear_ratio
       FROM unified_student_profiles
      WHERE institution_id = $1 AND department_id IS NOT NULL
      GROUP BY department_id`,
    [institutionId],
  );

  await withTransaction(async (client) => {
    // Regenerate: clear prior OPEN auto-recommendations, keep actioned ones.
    await client.query(
      `DELETE FROM recommendations WHERE institution_id = $1 AND status = 'OPEN'`,
      [institutionId],
    );

    for (const rule of rules) {
      if (rule.scope_level === "STUDENT") {
        const students = await query<Record<string, unknown>>(
          `SELECT student_id, current_cgpa, avg_attendance_pct, active_arrears,
                  history_arrears, risk_score, avg_internal
             FROM unified_student_profiles WHERE institution_id = $1`,
          [institutionId],
        );
        for (const st of students) {
          const metrics = numeric(st);
          if (evaluate(metrics, rule)) {
            await client.query(
              `INSERT INTO recommendations
                 (institution_id, rule_id, scope_level, student_id, action_text, priority, rationale)
               VALUES ($1,$2,'STUDENT',$3,$4,$5,$6)`,
              [institutionId, rule.id, st.student_id, rule.action_text, rule.priority, JSON.stringify({ conditions: rule.conditions })],
            );
            byScope.STUDENT++;
          }
        }
      } else if (rule.scope_level === "DEPARTMENT") {
        for (const d of deptMetrics) {
          const metrics = numeric(d);
          if (evaluate(metrics, rule)) {
            await client.query(
              `INSERT INTO recommendations
                 (institution_id, rule_id, scope_level, department_id, action_text, priority, rationale)
               VALUES ($1,$2,'DEPARTMENT',$3,$4,$5,$6)`,
              [institutionId, rule.id, d.department_id, rule.action_text, rule.priority, JSON.stringify(d)],
            );
            byScope.DEPARTMENT++;
          }
        }
      } else {
        // INSTITUTION: aggregate across departments.
        const total = deptMetrics.reduce((a, d) => a + Number(d.total), 0);
        const metrics: Record<string, number | null> = {
          avg_cgpa: avg(deptMetrics.map((d) => Number(d.avg_cgpa))),
          placement_pct: avg(deptMetrics.map((d) => Number(d.placement_pct))),
          high_arrear_ratio: avg(deptMetrics.map((d) => Number(d.high_arrear_ratio))),
          total,
        };
        if (evaluate(metrics, rule)) {
          await client.query(
            `INSERT INTO recommendations
               (institution_id, rule_id, scope_level, action_text, priority, rationale)
             VALUES ($1,$2,'INSTITUTION',$3,$4,$5)`,
            [institutionId, rule.id, rule.action_text, rule.priority, JSON.stringify(metrics)],
          );
          byScope.INSTITUTION++;
        }
      }
    }
  });

  return { generated: byScope.STUDENT + byScope.DEPARTMENT + byScope.INSTITUTION, byScope };
}

function numeric(row: Record<string, unknown>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v === null || v === undefined ? null : Number(v);
  }
  return out;
}
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
