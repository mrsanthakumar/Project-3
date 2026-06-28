import { z } from "zod";
import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { parseListParams } from "@/lib/query";
import { generateReportFile, type ReportType, type ReportFormat } from "@/lib/reports/generate";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  reportType: z.enum(["ADMISSION", "ACADEMIC", "PLACEMENT", "RISK", "STUDENT", "DEPARTMENT"]),
  format: z.enum(["PDF", "EXCEL"]),
  params: z.record(z.unknown()).optional(),
});

/** Request a report. Generates inline, returns 202 + jobId; poll GET /reports/{id}. */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "report.export");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());

  const job = await queryOne<{ id: string }>(
    `INSERT INTO report_exports (institution_id, report_type, format, params, status, requested_by)
     VALUES ($1,$2,$3,$4,'PROCESSING',$5) RETURNING id`,
    [institutionId, body.reportType, body.format, JSON.stringify(body.params ?? {}), ctx.userId],
  );
  if (!job) throw new ApiError("INTERNAL", "Could not create report job");

  await generateReportFile(job.id, institutionId, body.reportType as ReportType, body.format as ReportFormat);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "EXPORT", entity: "report",
    entityId: job.id, detail: body, ip: clientIp(req),
  });

  return ok(
    { jobId: job.id, status: "READY", downloadUrl: `/api/v1/reports/${job.id}/download` },
    null,
    202,
  );
});

/** List report history. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "report.export");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { page, pageSize } = parseListParams(req);

  const totalRow = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM report_exports WHERE institution_id = $1`, [institutionId]);
  const total = Number(totalRow?.count ?? 0);

  const rows = await query(
    `SELECT id, report_type, format, status, requested_at, completed_at
       FROM report_exports WHERE institution_id = $1
      ORDER BY requested_at DESC LIMIT $2 OFFSET $3`,
    [institutionId, pageSize, (page - 1) * pageSize],
  );
  return ok(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 });
});
