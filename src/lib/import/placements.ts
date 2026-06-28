import { query, queryOne } from "@/lib/db";
import type { RowError } from "@/lib/import/parse";

const num = (v: unknown) => (v === null || v === "" ? null : Number(v));
const bool = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
};

/**
 * Import placement records. Resolves student by register number and company
 * by name; the drive is resolved by title within the tenant.
 */
export async function importPlacements(
  rows: Record<string, unknown>[],
  institutionId: string,
): Promise<{ successRows: number; errors: RowError[] }> {
  const [students, companies, drives] = await Promise.all([
    query<{ id: string; register_number: string }>(
      `SELECT id, register_number FROM students WHERE institution_id = $1 AND deleted_at IS NULL`,
      [institutionId],
    ),
    query<{ id: string; name: string }>(
      `SELECT id, name FROM companies WHERE institution_id = $1`,
      [institutionId],
    ),
    query<{ id: string; title: string }>(
      `SELECT id, title FROM recruitment_drives WHERE institution_id = $1`,
      [institutionId],
    ),
  ]);
  const studentByReg = new Map(students.map((s) => [s.register_number.toUpperCase(), s.id]));
  const companyByName = new Map(companies.map((c) => [c.name.toUpperCase(), c.id]));
  const driveByTitle = new Map(drives.map((d) => [d.title.toUpperCase(), d.id]));

  const errors: RowError[] = [];
  let successRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 1;
    const studentId = studentByReg.get(String(raw.register_number ?? "").toUpperCase());
    const companyId = companyByName.get(String(raw.company ?? "").toUpperCase());
    const driveId = driveByTitle.get(String(raw.drive ?? "").toUpperCase());

    if (!studentId) { errors.push({ row: rowNum, field: "register_number", message: "Unknown student" }); continue; }
    if (!companyId) { errors.push({ row: rowNum, field: "company", message: "Unknown company" }); continue; }
    if (!driveId) { errors.push({ row: rowNum, field: "drive", message: "Unknown drive" }); continue; }

    const selected = bool(raw.selected);
    const attended = bool(raw.attended) || selected;
    const applied = bool(raw.applied) || attended;
    const status = selected ? "SELECTED" : attended ? "ATTENDED" : "APPLIED";

    try {
      await query(
        `INSERT INTO placements
           (institution_id, drive_id, company_id, student_id, status, applied, attended, selected, package_lpa, is_internship)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (drive_id, student_id) DO UPDATE SET
           status = EXCLUDED.status, applied = EXCLUDED.applied, attended = EXCLUDED.attended,
           selected = EXCLUDED.selected, package_lpa = EXCLUDED.package_lpa`,
        [institutionId, driveId, companyId, studentId, status, applied, attended, selected, num(raw.package), bool(raw.internship)],
      );
      successRows++;
    } catch {
      errors.push({ row: rowNum, message: "Failed to insert placement row" });
    }
  }
  return { successRows, errors };
}
