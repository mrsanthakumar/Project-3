import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

/** Report job status + download URL when ready. */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "report.export");
  const institutionId = resolveInstitutionScope(ctx, req);

  const job = await queryOne<{
    id: string; report_type: string; format: string; status: string;
    error_message: string | null; requested_at: string; completed_at: string | null;
  }>(
    `SELECT id, report_type, format, status, error_message, requested_at, completed_at
       FROM report_exports WHERE id = $1 AND institution_id = $2`,
    [params!.jobId, institutionId],
  );
  if (!job) throw new ApiError("NOT_FOUND", "Report not found");

  return ok({
    jobId: job.id,
    reportType: job.report_type,
    format: job.format,
    status: job.status,
    error: job.error_message,
    downloadUrl: job.status === "READY" ? `/api/v1/reports/${job.id}/download` : null,
    requestedAt: job.requested_at,
    completedAt: job.completed_at,
  });
});
