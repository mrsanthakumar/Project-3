import { ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { parseUpload, type RowError } from "@/lib/import/parse";
import { createImportJob, completeImportJob } from "@/lib/import/jobs";
import { recordAudit, clientIp } from "@/lib/audit";

type Importer = (
  rows: Record<string, unknown>[],
  institutionId: string,
) => Promise<{ successRows: number; errors: RowError[] }>;

/** Shared bulk-upload pipeline: parse → job → import → complete → 202. */
export async function runBulkUpload(
  req: Request,
  opts: { entity: string; permission: string; importer: Importer },
): Promise<Response> {
  const ctx = getAuthContext(req);
  requirePermission(ctx, opts.permission);
  const institutionId = resolveInstitutionScope(ctx, req);

  const { rows, fileName } = await parseUpload(req);
  const jobId = await createImportJob({
    institutionId,
    userId: ctx.userId,
    entity: opts.entity,
    fileName,
    totalRows: rows.length,
  });

  const result = await opts.importer(rows, institutionId);
  await completeImportJob(jobId, result);

  await recordAudit({
    institutionId,
    userId: ctx.userId,
    action: "UPLOAD",
    entity: opts.entity,
    entityId: jobId,
    detail: { fileName, total: rows.length, success: result.successRows, errors: result.errors.length },
    ip: clientIp(req),
  });

  return ok(
    {
      jobId,
      status: "READY",
      summary: { totalRows: rows.length, successRows: result.successRows, errorRows: result.errors.length },
      errors: result.errors.slice(0, 100),
    },
    null,
    202,
  );
}
