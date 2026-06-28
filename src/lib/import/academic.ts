import { query } from "@/lib/db";
import type { RowError } from "@/lib/import/parse";
import { recomputeStudentAcademics } from "@/lib/academic/rollup";

const num = (v: unknown) => (v === null || v === "" ? null : Number(v));

/** Build register_number→id and subject_code→id lookup maps for a tenant. */
async function loadLookups(institutionId: string) {
  const [students, subjects] = await Promise.all([
    query<{ id: string; register_number: string }>(
      `SELECT id, register_number FROM students WHERE institution_id = $1 AND deleted_at IS NULL`,
      [institutionId],
    ),
    query<{ id: string; code: string }>(
      `SELECT id, code FROM subjects WHERE institution_id = $1`,
      [institutionId],
    ),
  ]);
  return {
    studentByReg: new Map(students.map((s) => [s.register_number.toUpperCase(), s.id])),
    subjectByCode: new Map(subjects.map((s) => [s.code.toUpperCase(), s.id])),
  };
}

function resolve(
  raw: Record<string, unknown>,
  rowNum: number,
  maps: Awaited<ReturnType<typeof loadLookups>>,
  errors: RowError[],
): { studentId: string; subjectId: string } | null {
  const reg = String(raw.register_number ?? "").toUpperCase();
  const code = String(raw.subject_code ?? raw.subject ?? "").toUpperCase();
  const studentId = maps.studentByReg.get(reg);
  const subjectId = maps.subjectByCode.get(code);
  if (!studentId) {
    errors.push({ row: rowNum, field: "register_number", message: `Unknown student "${reg}"` });
    return null;
  }
  if (!subjectId) {
    errors.push({ row: rowNum, field: "subject_code", message: `Unknown subject "${code}"` });
    return null;
  }
  return { studentId, subjectId };
}

const ATT_STATUS = ["PRESENT", "ABSENT", "OD", "LEAVE"];

export async function importAttendance(rows: Record<string, unknown>[], institutionId: string) {
  const maps = await loadLookups(institutionId);
  const errors: RowError[] = [];
  let successRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const ref = resolve(rows[i], i + 1, maps, errors);
    if (!ref) continue;
    const status = String(rows[i].status ?? "").toUpperCase();
    if (!ATT_STATUS.includes(status)) {
      errors.push({ row: i + 1, field: "status", message: `Invalid status "${status}"` });
      continue;
    }
    try {
      await query(
        `INSERT INTO attendance (institution_id, student_id, subject_id, attendance_date, status, period)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (student_id, subject_id, attendance_date, period)
         DO UPDATE SET status = EXCLUDED.status`,
        [institutionId, ref.studentId, ref.subjectId, String(rows[i].date ?? rows[i].attendance_date), status, num(rows[i].period)],
      );
      successRows++;
    } catch {
      errors.push({ row: i + 1, message: "Failed to insert attendance row" });
    }
  }
  return { successRows, errors };
}

export async function importInternalMarks(rows: Record<string, unknown>[], institutionId: string) {
  const maps = await loadLookups(institutionId);
  const errors: RowError[] = [];
  let successRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const ref = resolve(rows[i], i + 1, maps, errors);
    if (!ref) continue;
    try {
      await query(
        `INSERT INTO internal_marks (institution_id, student_id, subject_id, semester, test1, test2, assignment)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (student_id, subject_id, semester)
         DO UPDATE SET test1 = EXCLUDED.test1, test2 = EXCLUDED.test2, assignment = EXCLUDED.assignment,
                       internal_average = NULL`,
        [institutionId, ref.studentId, ref.subjectId, num(rows[i].semester), num(rows[i].test1), num(rows[i].test2), num(rows[i].assignment)],
      );
      successRows++;
    } catch {
      errors.push({ row: i + 1, message: "Failed to insert internal-marks row" });
    }
  }
  return { successRows, errors };
}

const RESULT = ["PASS", "FAIL", "ABSENT", "WITHHELD"];

export async function importSemesterResults(rows: Record<string, unknown>[], institutionId: string) {
  const maps = await loadLookups(institutionId);
  const errors: RowError[] = [];
  const affected = new Set<string>();
  let successRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const ref = resolve(rows[i], i + 1, maps, errors);
    if (!ref) continue;
    const result = String(rows[i].result ?? "").toUpperCase();
    try {
      await query(
        `INSERT INTO semester_results
           (institution_id, student_id, subject_id, semester, grade, grade_points, result, credits_earned)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (student_id, subject_id, semester)
         DO UPDATE SET grade = EXCLUDED.grade, grade_points = EXCLUDED.grade_points,
                       result = EXCLUDED.result, credits_earned = EXCLUDED.credits_earned`,
        [
          institutionId, ref.studentId, ref.subjectId, num(rows[i].semester),
          rows[i].grade != null ? String(rows[i].grade) : null,
          num(rows[i].grade_points), RESULT.includes(result) ? result : null,
          num(rows[i].credits_earned),
        ],
      );
      affected.add(ref.studentId);
      successRows++;
    } catch {
      errors.push({ row: i + 1, message: "Failed to insert result row" });
    }
  }
  // Recompute GPA/CGPA/arrears for every student touched by this import.
  for (const studentId of affected) {
    await recomputeStudentAcademics(studentId);
  }
  return { successRows, errors };
}
