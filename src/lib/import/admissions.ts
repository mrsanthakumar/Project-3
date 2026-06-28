import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import type { RowError } from "@/lib/import/parse";

const ADMISSION_TYPE = ["COUNSELING", "MANAGEMENT", "LATERAL_ENTRY", "SPORTS", "NRI"];
const num = (v: unknown) => (v === null || v === "" ? undefined : Number(v));
const bool = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
};

const rowSchema = z.object({
  admissionYear: z.number().int().min(1980).max(2100),
  registerNumber: z.string().optional(),
  departmentCode: z.string().optional(),
  admissionType: z.string().optional(),
  cutoffMark: z.number().min(0).max(200).optional(),
  schoolName: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
});

/** Import admission rows, linking to existing students by register number. */
export async function importAdmissions(
  rows: Record<string, unknown>[],
  institutionId: string,
): Promise<{ successRows: number; errors: RowError[] }> {
  const depRows = await query<{ id: string; code: string }>(
    `SELECT id, code FROM departments WHERE institution_id = $1 AND deleted_at IS NULL`,
    [institutionId],
  );
  const deptByCode = new Map(depRows.map((d) => [d.code.toUpperCase(), d.id]));

  const errors: RowError[] = [];
  let successRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const raw = rows[i];
    const at = String(raw.admission_type ?? "").toUpperCase().replace(/\s+/g, "_");
    const parsed = rowSchema.safeParse({
      admissionYear: num(raw.admission_year),
      registerNumber: raw.register_number != null ? String(raw.register_number) : undefined,
      departmentCode: raw.department != null ? String(raw.department) : undefined,
      admissionType: ADMISSION_TYPE.includes(at) ? at : undefined,
      cutoffMark: num(raw.cutoff_marks ?? raw.cutoff_mark),
      schoolName: raw.school_name != null ? String(raw.school_name) : undefined,
      district: raw.district != null ? String(raw.district) : undefined,
      state: raw.state != null ? String(raw.state) : undefined,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.errors) {
        errors.push({ row: rowNum, field: issue.path.join("."), message: issue.message });
      }
      continue;
    }
    const r = parsed.data;

    const departmentId = r.departmentCode
      ? deptByCode.get(r.departmentCode.toUpperCase()) ?? null
      : null;
    if (r.departmentCode && !departmentId) {
      errors.push({ row: rowNum, field: "department", message: `Unknown department "${r.departmentCode}"` });
      continue;
    }

    let studentId: string | null = null;
    if (r.registerNumber) {
      const s = await queryOne<{ id: string }>(
        `SELECT id FROM students WHERE institution_id = $1 AND register_number = $2 AND deleted_at IS NULL`,
        [institutionId, r.registerNumber],
      );
      studentId = s?.id ?? null;
    }

    try {
      await query(
        `INSERT INTO admissions
           (institution_id, student_id, department_id, admission_year, admission_type,
            is_management_quota, is_counseling_quota, is_lateral_entry, cutoff_mark,
            school_name, district, state)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          institutionId, studentId, departmentId, r.admissionYear, r.admissionType ?? null,
          bool(raw.management_quota), bool(raw.counseling_quota), bool(raw.lateral_entry),
          r.cutoffMark ?? null, r.schoolName ?? null, r.district ?? null, r.state ?? null,
        ],
      );
      successRows++;
    } catch {
      errors.push({ row: rowNum, message: "Failed to insert admission row" });
    }
  }

  return { successRows, errors };
}
