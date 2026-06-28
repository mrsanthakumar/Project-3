import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import type { RowError } from "@/lib/import/parse";

/**
 * Maps normalised sheet headers (lowercase, spaces→_) to a student record.
 * Department is given by code and resolved to department_id per institution.
 */
const GENDER: Record<string, string> = {
  m: "MALE", male: "MALE", f: "FEMALE", female: "FEMALE", o: "OTHER", other: "OTHER",
};
const ADMISSION_TYPE = ["COUNSELING", "MANAGEMENT", "LATERAL_ENTRY", "SPORTS", "NRI"];

const num = (v: unknown) => (v === null || v === "" ? undefined : Number(v));

const rowSchema = z.object({
  registerNumber: z.string().min(1, "register number required"),
  name: z.string().min(1, "name required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  mobile: z.string().optional(),
  tenthPercentage: z.number().min(0).max(100).optional(),
  twelfthPercentage: z.number().min(0).max(100).optional(),
  diplomaPercentage: z.number().min(0).max(100).optional(),
  admissionType: z.string().optional(),
  cutoffMark: z.number().min(0).max(200).optional(),
  departmentCode: z.string().optional(),
});

function toRecord(raw: Record<string, unknown>) {
  const g = String(raw.gender ?? "").toLowerCase();
  const at = String(raw.admission_type ?? "").toUpperCase().replace(/\s+/g, "_");
  return {
    registerNumber: raw.register_number != null ? String(raw.register_number) : "",
    name: raw.student_name != null ? String(raw.student_name) : String(raw.name ?? ""),
    gender: GENDER[g],
    dateOfBirth: raw.date_of_birth ? String(raw.date_of_birth) : undefined,
    email: raw.email != null ? String(raw.email) : undefined,
    mobile: raw.mobile != null ? String(raw.mobile) : undefined,
    tenthPercentage: num(raw["10th_percentage"]),
    twelfthPercentage: num(raw["12th_percentage"]),
    diplomaPercentage: num(raw.diploma_percentage),
    admissionType: ADMISSION_TYPE.includes(at) ? at : undefined,
    cutoffMark: num(raw.cutoff_mark),
    departmentCode: raw.department != null ? String(raw.department) : undefined,
  };
}

export async function importStudents(
  rows: Record<string, unknown>[],
  institutionId: string,
): Promise<{ successRows: number; errors: RowError[] }> {
  // Pre-load department code → id map for the tenant.
  const depRows = await query<{ id: string; code: string }>(
    `SELECT id, code FROM departments WHERE institution_id = $1 AND deleted_at IS NULL`,
    [institutionId],
  );
  const deptByCode = new Map(depRows.map((d) => [d.code.toUpperCase(), d.id]));

  const errors: RowError[] = [];
  let successRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const parsed = rowSchema.safeParse(toRecord(rows[i]));
    if (!parsed.success) {
      for (const issue of parsed.error.errors) {
        errors.push({ row: rowNum, field: issue.path.join("."), message: issue.message });
      }
      continue;
    }
    const r = parsed.data;

    let departmentId: string | null = null;
    if (r.departmentCode) {
      departmentId = deptByCode.get(r.departmentCode.toUpperCase()) ?? null;
      if (!departmentId) {
        errors.push({ row: rowNum, field: "department", message: `Unknown department "${r.departmentCode}"` });
        continue;
      }
    }

    try {
      await queryOne(
        `INSERT INTO students
           (institution_id, register_number, name, gender, date_of_birth, email, mobile,
            tenth_percentage, twelfth_percentage, diploma_percentage, admission_type,
            cutoff_mark, department_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          institutionId, r.registerNumber, r.name, r.gender ?? null, r.dateOfBirth ?? null,
          r.email ?? null, r.mobile ?? null, r.tenthPercentage ?? null,
          r.twelfthPercentage ?? null, r.diplomaPercentage ?? null, r.admissionType ?? null,
          r.cutoffMark ?? null, departmentId,
        ],
      );
      successRows++;
    } catch (e) {
      const err = e as { code?: string };
      errors.push({
        row: rowNum,
        field: "registerNumber",
        message:
          err.code === "23505"
            ? `Duplicate register number "${r.registerNumber}"`
            : "Failed to insert row",
      });
    }
  }

  return { successRows, errors };
}
