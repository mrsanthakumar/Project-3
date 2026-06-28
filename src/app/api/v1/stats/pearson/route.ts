import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import {
  assertMetric, callStats, fetchPair, interpretCorrelation, saveReport,
} from "@/lib/analytics/stats";

export const runtime = "nodejs";

const schema = z.object({ x: z.string(), y: z.string() });
type StatResult = { statistic: number; pValue: number; sampleSize: number; effectSize: number };

/** Pearson correlation, e.g. 12th % vs CGPA. */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "stats.run");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());
  const x = assertMetric(body.x);
  const y = assertMetric(body.y);

  const data = await fetchPair(institutionId, x, y);
  const result = await callStats<StatResult>("/pearson", data);
  const interpretation = interpretCorrelation(result.statistic, result.pValue);

  const reportId = await saveReport({
    institutionId, userId: ctx.userId, testType: "PEARSON",
    variables: { x, y }, scope: null,
    statistic: result.statistic, pValue: result.pValue,
    effectSize: result.effectSize, sampleSize: result.sampleSize,
    interpretation, raw: result,
  });

  return ok({ reportId, testType: "PEARSON", ...result, interpretation });
});
