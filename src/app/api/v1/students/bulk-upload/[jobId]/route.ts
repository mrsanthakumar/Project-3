import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { getImportJob } from "@/lib/import/jobs";

export const runtime = "nodejs";

export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "student.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const job = await getImportJob(params!.jobId, institutionId);
  if (!job) throw new ApiError("NOT_FOUND", "Import job not found");

  return ok({
    jobId: job.id,
    entity: job.entity,
    status: job.status,
    fileName: job.file_name,
    summary: {
      totalRows: job.total_rows,
      successRows: job.success_rows,
      errorRows: job.error_rows,
    },
    errors: job.errors ?? [],
    createdAt: job.created_at,
    completedAt: job.completed_at,
  });
});
