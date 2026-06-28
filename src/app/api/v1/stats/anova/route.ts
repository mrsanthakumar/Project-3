import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import {
  assertMetric, callStats, fetchDepartmentGroups, interpretComparison, saveReport,
} from "@/lib/analytics/stats";

export const runtime = "nodejs";

// groupBy fixed to department_id for the spec's branch-wise performance ANOVA.
const schema = z.object({ metric: z.string(), groupBy: z.literal("department_id").optional() });
type AResult = { statistic: number; pValue: number; sampleSize: number; groups: number };

/** One-way ANOVA: a metric compared across departments (branches). */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "stats.run");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());
  const metric = assertMetric(body.metric);

  const groups = await fetchDepartmentGroups(institutionId, metric);
  const result = await callStats<AResult>("/anova", { groups });
  const interpretation = interpretComparison(result.pValue);

  const reportId = await saveReport({
    institutionId, userId: ctx.userId, testType: "ANOVA",
    variables: { metric, groupBy: "department_id" }, scope: null,
    statistic: result.statistic, pValue: result.pValue,
    effectSize: null, sampleSize: result.sampleSize,
    interpretation, raw: result,
  });

  return ok({ reportId, testType: "ANOVA", ...result, interpretation });
});
