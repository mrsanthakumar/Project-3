import { query, queryOne, withTransaction } from "@/lib/db";
import { ApiError } from "@/lib/http";

/**
 * Dynamic eligibility engine (Module 10). No criteria are hardcoded: each
 * recruitment_criteria row references a criteria_master entry whose
 * `source_path` names a field on the student evaluation context, and a
 * comparator + value. A student is eligible when (ALL | ANY) criteria pass.
 */

// The evaluation context: columns are aliased to match criteria_master.source_path.
const STUDENT_CONTEXT_SQL = `
  SELECT s.id AS student_id, s.register_number, s.name,
         s.tenth_percentage, s.twelfth_percentage, s.diploma_percentage,
         s.current_cgpa, s.active_arrears, s.history_arrears,
         s.department_id, s.gender,
         COALESCE(e.internship_count, 0)    AS internship_count,
         COALESCE(e.certification_count, 0) AS certification_count,
         COALESCE(e.hackathon_count, 0)     AS hackathon_count,
         e.coding_score
    FROM students s
    LEFT JOIN student_profiles_extra e ON e.student_id = s.id
   WHERE s.institution_id = $1 AND s.deleted_at IS NULL AND s.status = 'ACTIVE'`;

interface CriterionRow {
  id: string;
  code: string;
  label: string;
  source_path: string;
  data_type: string;
  comparator: string;
  value_numeric: string | null;
  value_text: string | null;
  value_json: unknown;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Evaluate one criterion against a student's actual value. */
function passes(actual: unknown, c: CriterionRow): boolean {
  const cmp = c.comparator;

  // Set membership
  if (cmp === "IN" || cmp === "NOT_IN") {
    const list = Array.isArray(c.value_json) ? c.value_json.map(String) : [];
    const inList = list.includes(String(actual));
    return cmp === "IN" ? inList : !inList;
  }

  // Range
  if (cmp === "BETWEEN") {
    const a = toNum(actual);
    const range = Array.isArray(c.value_json) ? c.value_json.map(Number) : [];
    if (a === null || range.length !== 2) return false;
    return a >= range[0] && a <= range[1];
  }

  // Equality (numeric or text)
  if (cmp === "EQ" || cmp === "NEQ") {
    let equal: boolean;
    if (c.value_numeric !== null) {
      equal = toNum(actual) === Number(c.value_numeric);
    } else {
      equal = String(actual ?? "") === String(c.value_text ?? "");
    }
    return cmp === "EQ" ? equal : !equal;
  }

  // Numeric ordering
  const a = toNum(actual);
  const v = c.value_numeric !== null ? Number(c.value_numeric) : null;
  if (a === null || v === null) return false;
  switch (cmp) {
    case "GTE": return a >= v;
    case "LTE": return a <= v;
    case "GT": return a > v;
    case "LT": return a < v;
    default: return false;
  }
}

function describe(c: CriterionRow): string {
  const val =
    c.value_numeric ?? c.value_text ?? (c.value_json != null ? JSON.stringify(c.value_json) : "");
  const op: Record<string, string> = {
    GTE: ">=", LTE: "<=", GT: ">", LT: "<", EQ: "=", NEQ: "!=",
    IN: "in", NOT_IN: "not in", BETWEEN: "between",
  };
  return `${c.label} ${op[c.comparator] ?? c.comparator} ${val}`;
}

export interface EligibilitySummary {
  driveId: string;
  matchMode: string;
  evaluated: number;
  eligible: number;
}

/** Recompute and persist eligibility for every active student in the tenant. */
export async function recomputeDriveEligibility(
  driveId: string,
  institutionId: string,
): Promise<EligibilitySummary> {
  const drive = await queryOne<{ id: string; match_mode: string }>(
    `SELECT id, match_mode FROM recruitment_drives WHERE id = $1 AND institution_id = $2`,
    [driveId, institutionId],
  );
  if (!drive) throw new ApiError("NOT_FOUND", "Recruitment drive not found");

  const criteria = await query<CriterionRow>(
    `SELECT rc.id, cm.code, cm.label, cm.source_path, cm.data_type,
            rc.comparator, rc.value_numeric, rc.value_text, rc.value_json
       FROM recruitment_criteria rc
       JOIN criteria_master cm ON cm.id = rc.criteria_id
      WHERE rc.drive_id = $1`,
    [driveId],
  );

  const students = await query<Record<string, unknown>>(STUDENT_CONTEXT_SQL, [institutionId]);
  const matchAll = drive.match_mode !== "ANY";
  let eligible = 0;

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM drive_eligible_students WHERE drive_id = $1`, [driveId]);

    for (const st of students) {
      const failed: { code: string; required: string; actual: unknown }[] = [];
      let anyPass = false;

      for (const c of criteria) {
        const actual = st[c.source_path];
        if (passes(actual, c)) {
          anyPass = true;
        } else {
          failed.push({ code: c.code, required: describe(c), actual: actual ?? null });
        }
      }

      // No criteria → everyone eligible. ALL → no failures. ANY → at least one pass.
      const isEligible =
        criteria.length === 0 ? true : matchAll ? failed.length === 0 : anyPass;
      if (isEligible) eligible++;

      await client.query(
        `INSERT INTO drive_eligible_students
           (institution_id, drive_id, student_id, is_eligible, failed_criteria)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (drive_id, student_id) DO UPDATE
           SET is_eligible = EXCLUDED.is_eligible,
               failed_criteria = EXCLUDED.failed_criteria,
               computed_at = now()`,
        [institutionId, driveId, st.student_id, isEligible, JSON.stringify(matchAll ? failed : isEligible ? [] : failed)],
      );
    }
  });

  return { driveId, matchMode: drive.match_mode, evaluated: students.length, eligible };
}
