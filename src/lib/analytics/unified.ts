import { query } from "@/lib/db";

/**
 * Unified Analytics Engine (Module 12). Rebuilds unified_student_profiles for
 * a tenant by joining admission → academics → attendance → placement per
 * student. This is the single read model that dashboards, cross-funnel
 * analytics, the eligibility engine, and risk scoring all read from.
 *
 * Risk columns (risk_level / risk_score) are intentionally NOT overwritten on
 * conflict — they are owned by the risk engine (Phase 10).
 */
export async function refreshUnifiedProfiles(
  institutionId: string,
  studentId?: string,
): Promise<{ refreshed: number }> {
  const scope = studentId ? "AND s.id = $2" : "";
  const args: unknown[] = studentId ? [institutionId, studentId] : [institutionId];

  const rows = await query<{ student_id: string }>(
    `INSERT INTO unified_student_profiles (
        student_id, institution_id, department_id, batch_id, cohort_id,
        admission_year, admission_type, cutoff_mark,
        tenth_percentage, twelfth_percentage, diploma_percentage,
        current_cgpa, active_arrears, history_arrears,
        avg_attendance_pct, avg_internal,
        internship_count, certification_count, hackathon_count, coding_score,
        is_placed, highest_package_lpa, offers_count, refreshed_at)
     SELECT
        s.id, s.institution_id, s.department_id, s.batch_id, b.cohort_id,
        adm.admission_year, s.admission_type, s.cutoff_mark,
        s.tenth_percentage, s.twelfth_percentage, s.diploma_percentage,
        s.current_cgpa, s.active_arrears, s.history_arrears,
        att.avg_attendance_pct, im.avg_internal,
        COALESCE(e.internship_count, 0), COALESCE(e.certification_count, 0),
        COALESCE(e.hackathon_count, 0), e.coding_score,
        COALESCE(pl.is_placed, FALSE), pl.highest_package, COALESCE(pl.offers, 0),
        now()
     FROM students s
     LEFT JOIN batches b ON b.id = s.batch_id
     LEFT JOIN LATERAL (
        SELECT admission_year FROM admissions a
         WHERE a.student_id = s.id ORDER BY admission_year DESC LIMIT 1
     ) adm ON TRUE
     LEFT JOIN (
        SELECT student_id,
               round(100.0 * SUM(CASE WHEN status IN ('PRESENT','OD') THEN 1 ELSE 0 END)
                     / NULLIF(count(*),0), 2) AS avg_attendance_pct
          FROM attendance GROUP BY student_id
     ) att ON att.student_id = s.id
     LEFT JOIN (
        SELECT student_id, round(avg(internal_average), 2) AS avg_internal
          FROM internal_marks GROUP BY student_id
     ) im ON im.student_id = s.id
     LEFT JOIN student_profiles_extra e ON e.student_id = s.id
     LEFT JOIN (
        SELECT student_id,
               bool_or(selected) AS is_placed,
               max(package_lpa) FILTER (WHERE selected) AS highest_package,
               count(*) FILTER (WHERE selected) AS offers
          FROM placements GROUP BY student_id
     ) pl ON pl.student_id = s.id
     WHERE s.institution_id = $1 AND s.deleted_at IS NULL ${scope}
     ON CONFLICT (student_id) DO UPDATE SET
        department_id      = EXCLUDED.department_id,
        batch_id           = EXCLUDED.batch_id,
        cohort_id          = EXCLUDED.cohort_id,
        admission_year     = EXCLUDED.admission_year,
        admission_type     = EXCLUDED.admission_type,
        cutoff_mark        = EXCLUDED.cutoff_mark,
        tenth_percentage   = EXCLUDED.tenth_percentage,
        twelfth_percentage = EXCLUDED.twelfth_percentage,
        diploma_percentage = EXCLUDED.diploma_percentage,
        current_cgpa       = EXCLUDED.current_cgpa,
        active_arrears     = EXCLUDED.active_arrears,
        history_arrears    = EXCLUDED.history_arrears,
        avg_attendance_pct = EXCLUDED.avg_attendance_pct,
        avg_internal       = EXCLUDED.avg_internal,
        internship_count   = EXCLUDED.internship_count,
        certification_count= EXCLUDED.certification_count,
        hackathon_count    = EXCLUDED.hackathon_count,
        coding_score       = EXCLUDED.coding_score,
        is_placed          = EXCLUDED.is_placed,
        highest_package_lpa= EXCLUDED.highest_package_lpa,
        offers_count       = EXCLUDED.offers_count,
        refreshed_at       = now()
     RETURNING student_id`,
    args,
  );

  return { refreshed: rows.length };
}
