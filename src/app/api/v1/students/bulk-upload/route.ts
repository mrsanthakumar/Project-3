import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { parseUpload } from "@/lib/import/parse";
import { importStudents } from "@/lib/import/students";
import { createImportJob, completeImportJob } from "@/lib/import/jobs";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Bulk student import. Processes the sheet inline (suitable for typical class
 * sizes), records an import_jobs row, and returns 202 + jobId so the client
 * can poll GET /students/bulk-upload/{jobId} for the per-row error report.
 * For very large files this loop is the unit that moves to a queue worker
 * (deployment phase) without changing the contract.
 */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "student.upload");
  const institutionId = resolveInstitutionScope(ctx, req);

  const { rows, fileName } = await parseUpload(req);
  const jobId = await createImportJob({
    institutionId,
    userId: ctx.userId,
    entity: "students",
    fileName,
    totalRows: rows.length,
  });

  const result = await importStudents(rows, institutionId);
  await completeImportJob(jobId, result);

  await recordAudit({
    institutionId,
    userId: ctx.userId,
    action: "UPLOAD",
    entity: "students",
    entityId: jobId,
    detail: { fileName, total: rows.length, success: result.successRows, errors: result.errors.length },
    ip: clientIp(req),
  });

  return ok(
    {
      jobId,
      status: "READY",
      summary: {
        totalRows: rows.length,
        successRows: result.successRows,
        errorRows: result.errors.length,
      },
      errors: result.errors.slice(0, 100),
    },
    null,
    202,
  );
});
