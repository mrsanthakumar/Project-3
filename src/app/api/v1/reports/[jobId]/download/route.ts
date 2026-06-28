import { readFile } from "fs/promises";
import { handle, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  PDF: "application/pdf",
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Stream the generated report file. */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "report.export");
  const institutionId = resolveInstitutionScope(ctx, req);

  const job = await queryOne<{ format: string; status: string; file_path: string | null }>(
    `SELECT format, status, file_path FROM report_exports WHERE id = $1 AND institution_id = $2`,
    [params!.jobId, institutionId],
  );
  if (!job) throw new ApiError("NOT_FOUND", "Report not found");
  if (job.status !== "READY" || !job.file_path) {
    throw new ApiError("UNPROCESSABLE", `Report is ${job.status}`);
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(job.file_path);
  } catch {
    throw new ApiError("NOT_FOUND", "Report file is no longer available");
  }

  await recordAudit({
    institutionId, userId: ctx.userId, action: "DOWNLOAD", entity: "report",
    entityId: params!.jobId, ip: clientIp(req),
  });

  const ext = job.format === "EXCEL" ? "xlsx" : "pdf";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": MIME[job.format] ?? "application/octet-stream",
      "content-disposition": `attachment; filename="report-${params!.jobId}.${ext}"`,
    },
  });
});
