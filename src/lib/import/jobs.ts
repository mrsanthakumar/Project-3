import { query, queryOne } from "@/lib/db";
import type { RowError } from "@/lib/import/parse";

export interface ImportJob {
  id: string;
  entity: string;
  status: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  errors: RowError[] | null;
  file_name: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function createImportJob(params: {
  institutionId: string;
  userId: string;
  entity: string;
  fileName: string;
  totalRows: number;
}): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO import_jobs (institution_id, user_id, entity, file_name, total_rows, status)
     VALUES ($1,$2,$3,$4,$5,'PROCESSING') RETURNING id`,
    [params.institutionId, params.userId, params.entity, params.fileName, params.totalRows],
  );
  return row!.id;
}

export async function completeImportJob(
  jobId: string,
  result: { successRows: number; errors: RowError[] },
): Promise<void> {
  await query(
    `UPDATE import_jobs
        SET status = 'READY', success_rows = $2, error_rows = $3, errors = $4, completed_at = now()
      WHERE id = $1`,
    [jobId, result.successRows, result.errors.length, JSON.stringify(result.errors)],
  );
}

export async function failImportJob(jobId: string, message: string): Promise<void> {
  await query(
    `UPDATE import_jobs
        SET status = 'FAILED', errors = $2, completed_at = now()
      WHERE id = $1`,
    [jobId, JSON.stringify([{ row: 0, message }])],
  );
}

export async function getImportJob(
  jobId: string,
  institutionId: string,
): Promise<ImportJob | null> {
  return queryOne<ImportJob>(
    `SELECT id, entity, status, total_rows, success_rows, error_rows, errors,
            file_name, created_at, completed_at
       FROM import_jobs WHERE id = $1 AND institution_id = $2`,
    [jobId, institutionId],
  );
}
