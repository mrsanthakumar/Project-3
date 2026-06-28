import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { parseUpload } from "@/lib/import/parse";
import { importAdmissions } from "@/lib/import/admissions";
import { createImportJob, completeImportJob } from "@/lib/import/jobs";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "admission.crud");
  const institutionId = resolveInstitutionScope(ctx, req);

  const { rows, fileName } = await parseUpload(req);
  const jobId = await createImportJob({
    institutionId, userId: ctx.userId, entity: "admissions", fileName, totalRows: rows.length,
  });

  const result = await importAdmissions(rows, institutionId);
  await completeImportJob(jobId, result);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPLOAD", entity: "admissions", entityId: jobId,
    detail: { fileName, total: rows.length, success: result.successRows, errors: result.errors.length },
    ip: clientIp(req),
  });

  return ok(
    {
      jobId, status: "READY",
      summary: { totalRows: rows.length, successRows: result.successRows, errorRows: result.errors.length },
      errors: result.errors.slice(0, 100),
    },
    null,
    202,
  );
});
