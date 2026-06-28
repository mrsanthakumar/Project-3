import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import {
  assertMetric, callStats, fetchPlacedGroups, interpretComparison, saveReport,
} from "@/lib/analytics/stats";

export const runtime = "nodejs";

// groupBy is fixed to is_placed for the spec's "Placed vs Not Placed" comparison.
const schema = z.object({ metric: z.string(), groupBy: z.literal("is_placed").optional() });
type TResult = {
  statistic: number; pValue: number; sampleSize: number; effectSize: number;
  meanA: number; meanB: number;
};

/** Independent (Welch) t-test: a metric for placed vs not-placed students. */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "stats.run");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());
  const metric = assertMetric(body.metric);

  const groups = await fetchPlacedGroups(institutionId, metric);
  const result = await callStats<TResult>("/ttest", groups);
  const interpretation = interpretComparison(result.pValue);

  const reportId = await saveReport({
    institutionId, userId: ctx.userId, testType: "TTEST",
    variables: { metric, groupBy: "is_placed" }, scope: null,
    statistic: result.statistic, pValue: result.pValue,
    effectSize: result.effectSize, sampleSize: result.sampleSize,
    interpretation, raw: result,
  });

  return ok({ reportId, testType: "TTEST", ...result, interpretation });
});
