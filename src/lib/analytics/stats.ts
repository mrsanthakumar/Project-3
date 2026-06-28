import { env } from "@/lib/env";
import { query, queryOne } from "@/lib/db";
import { ApiError } from "@/lib/http";

/**
 * Helpers for Module 15. Metrics are whitelisted to columns on
 * unified_student_profiles to prevent SQL injection (the value is interpolated
 * into the SELECT list, so it must never come straight from user input).
 */
export const METRICS = [
  "tenth_percentage", "twelfth_percentage", "diploma_percentage", "current_cgpa",
  "avg_attendance_pct", "avg_internal", "cutoff_mark", "coding_score",
  "active_arrears", "history_arrears", "highest_package_lpa",
] as const;
export type Metric = (typeof METRICS)[number];

export function assertMetric(m: string): Metric {
  if (!(METRICS as readonly string[]).includes(m)) {
    throw new ApiError("VALIDATION_ERROR", `Unknown metric "${m}"`);
  }
  return m as Metric;
}

/** Call the Python stats service. */
export async function callStats<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.analyticsUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("INTERNAL", "Statistics service is unavailable");
  }
  if (!res.ok) throw new ApiError("INTERNAL", `Stats service error (${res.status})`);
  const json = (await res.json()) as T & { error?: string };
  if (json.error) throw new ApiError("UNPROCESSABLE", json.error);
  return json;
}

/** Fetch a paired (x, y) sample for correlation tests. */
export async function fetchPair(institutionId: string, x: Metric, y: Metric) {
  const rows = await query<Record<string, number>>(
    `SELECT ${x} AS x, ${y} AS y FROM unified_student_profiles
      WHERE institution_id = $1 AND ${x} IS NOT NULL AND ${y} IS NOT NULL`,
    [institutionId],
  );
  return { x: rows.map((r) => Number(r.x)), y: rows.map((r) => Number(r.y)) };
}

/** Two groups split by the boolean is_placed column (for placed-vs-not t-test). */
export async function fetchPlacedGroups(institutionId: string, metric: Metric) {
  const rows = await query<{ is_placed: boolean; val: number }>(
    `SELECT is_placed, ${metric} AS val FROM unified_student_profiles
      WHERE institution_id = $1 AND ${metric} IS NOT NULL`,
    [institutionId],
  );
  return {
    groupA: rows.filter((r) => r.is_placed).map((r) => Number(r.val)),
    groupB: rows.filter((r) => !r.is_placed).map((r) => Number(r.val)),
  };
}

/** N groups split by department (for branch-wise ANOVA). */
export async function fetchDepartmentGroups(institutionId: string, metric: Metric) {
  const rows = await query<{ department_id: string; val: number }>(
    `SELECT department_id, ${metric} AS val FROM unified_student_profiles
      WHERE institution_id = $1 AND department_id IS NOT NULL AND ${metric} IS NOT NULL`,
    [institutionId],
  );
  const byDept = new Map<string, number[]>();
  for (const r of rows) {
    if (!byDept.has(r.department_id)) byDept.set(r.department_id, []);
    byDept.get(r.department_id)!.push(Number(r.val));
  }
  return [...byDept.values()];
}

export function interpretCorrelation(stat: number, p: number): string {
  const sig = p < 0.05 ? "statistically significant" : "not statistically significant";
  const a = Math.abs(stat);
  const strength = a < 0.3 ? "weak" : a < 0.6 ? "moderate" : "strong";
  const dir = stat >= 0 ? "positive" : "negative";
  return `${strength} ${dir} correlation (${sig}, p ${p < 0.05 ? "<" : "≥"} 0.05).`;
}

export function interpretComparison(p: number): string {
  return p < 0.05
    ? "Group difference is statistically significant (p < 0.05)."
    : "No statistically significant group difference (p ≥ 0.05).";
}

/** Persist a completed test into statistical_reports. */
export async function saveReport(params: {
  institutionId: string;
  userId: string;
  testType: string;
  variables: unknown;
  scope: unknown;
  statistic: number | null;
  pValue: number | null;
  effectSize: number | null;
  sampleSize: number | null;
  interpretation: string;
  raw: unknown;
}) {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO statistical_reports
       (institution_id, test_type, variables, scope, statistic, p_value, effect_size,
        sample_size, interpretation, raw_output, generated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      params.institutionId, params.testType, JSON.stringify(params.variables),
      JSON.stringify(params.scope ?? null), params.statistic, params.pValue,
      params.effectSize, params.sampleSize, params.interpretation,
      JSON.stringify(params.raw), params.userId,
    ],
  );
  return row!.id;
}
