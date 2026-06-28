import { query, queryOne } from "@/lib/db";

/** Data fetchers backing each report type (Module 17). */

export async function admissionReportData(institutionId: string) {
  const [trends, branchDemand, gender] = await Promise.all([
    query(`SELECT admission_year AS year, count(*)::int AS count FROM admissions
            WHERE institution_id = $1 GROUP BY admission_year ORDER BY admission_year`, [institutionId]),
    query(`SELECT d.code AS department, count(*)::int AS admissions FROM admissions a
            JOIN departments d ON d.id = a.department_id WHERE a.institution_id = $1
            GROUP BY d.code ORDER BY admissions DESC`, [institutionId]),
    query<{ gender: string | null; count: number }>(
      `SELECT s.gender, count(*)::int AS count FROM admissions a JOIN students s ON s.id = a.student_id
        WHERE a.institution_id = $1 GROUP BY s.gender`, [institutionId]),
  ]);
  return { trends, branchDemand, gender };
}

export async function academicReportData(institutionId: string) {
  const pass = await queryOne<{ pct: string }>(
    `SELECT round(100.0 * SUM(CASE WHEN result='PASS' THEN 1 ELSE 0 END)/NULLIF(count(*),0),2) AS pct
       FROM semester_results WHERE institution_id = $1`, [institutionId]);
  const cgpaTrend = await query(
    `SELECT semester, round(avg(cgpa),2) AS avg_cgpa FROM semester_gpa
      WHERE institution_id = $1 GROUP BY semester ORDER BY semester`, [institutionId]);
  const arrears = await queryOne<{ with_arrears: number; clean: number }>(
    `SELECT SUM(CASE WHEN active_arrears>0 THEN 1 ELSE 0 END)::int AS with_arrears,
            SUM(CASE WHEN active_arrears=0 THEN 1 ELSE 0 END)::int AS clean
       FROM students WHERE institution_id = $1 AND deleted_at IS NULL`, [institutionId]);
  return { passPercentage: Number(pass?.pct ?? 0), cgpaTrend, arrears };
}

export async function placementReportData(institutionId: string) {
  const summary = await queryOne<{ placed: number; total: number; highest: string; average: string }>(
    `SELECT
       (SELECT count(DISTINCT student_id) FROM placements WHERE institution_id=$1 AND selected)::int AS placed,
       (SELECT count(*) FROM students WHERE institution_id=$1 AND status='ACTIVE' AND deleted_at IS NULL)::int AS total,
       (SELECT max(package_lpa) FROM placements WHERE institution_id=$1 AND selected) AS highest,
       (SELECT round(avg(package_lpa),2) FROM placements WHERE institution_id=$1 AND selected) AS average`,
    [institutionId]);
  const deptWise = await query(
    `SELECT d.code AS department,
            round(100.0*count(DISTINCT p.student_id) FILTER (WHERE p.selected)/NULLIF(count(DISTINCT st.id),0),2) AS placed_pct
       FROM students st JOIN departments d ON d.id = st.department_id
       LEFT JOIN placements p ON p.student_id = st.id
      WHERE st.institution_id = $1 AND st.deleted_at IS NULL
      GROUP BY d.code ORDER BY placed_pct DESC NULLS LAST`, [institutionId]);
  const placed = Number(summary?.placed ?? 0);
  const total = Number(summary?.total ?? 0);
  return {
    placementPercentage: total ? Math.round((placed / total) * 10000) / 100 : 0,
    highestPackageLpa: summary?.highest ? Number(summary.highest) : 0,
    averagePackageLpa: summary?.average ? Number(summary.average) : 0,
    deptWise,
  };
}

export async function riskReportData(institutionId: string) {
  const distribution = await queryOne<{ low: number; medium: number; high: number }>(
    `SELECT count(*) FILTER (WHERE risk_level='LOW')::int AS low,
            count(*) FILTER (WHERE risk_level='MEDIUM')::int AS medium,
            count(*) FILTER (WHERE risk_level='HIGH')::int AS high
       FROM unified_student_profiles WHERE institution_id = $1`, [institutionId]);
  const highRisk = await query(
    `SELECT s.register_number, s.name, u.risk_score, u.current_cgpa, u.avg_attendance_pct, u.active_arrears
       FROM unified_student_profiles u JOIN students s ON s.id = u.student_id
      WHERE u.institution_id = $1 AND u.risk_level = 'HIGH'
      ORDER BY u.risk_score DESC LIMIT 100`, [institutionId]);
  return { distribution: distribution ?? { low: 0, medium: 0, high: 0 }, highRisk };
}

export async function studentReportRows(institutionId: string) {
  return query(
    `SELECT s.register_number AS "Register Number", s.name AS "Name", s.gender AS "Gender",
            d.code AS "Department", s.current_cgpa AS "CGPA",
            s.active_arrears AS "Active Arrears", s.history_arrears AS "History Arrears", s.status AS "Status"
       FROM students s LEFT JOIN departments d ON d.id = s.department_id
      WHERE s.institution_id = $1 AND s.deleted_at IS NULL
      ORDER BY s.register_number`, [institutionId]);
}

export async function departmentReportRows(institutionId: string) {
  return query(
    `SELECT d.code AS "Department", d.name AS "Name", count(u.*)::int AS "Students",
            round(avg(u.current_cgpa),2) AS "Avg CGPA",
            round(avg(u.avg_attendance_pct),2) AS "Avg Attendance",
            count(*) FILTER (WHERE u.is_placed)::int AS "Placed",
            round(100.0*count(*) FILTER (WHERE u.is_placed)/NULLIF(count(u.*),0),2) AS "Placement %"
       FROM unified_student_profiles u JOIN departments d ON d.id = u.department_id
      WHERE u.institution_id = $1 GROUP BY d.code, d.name ORDER BY d.code`, [institutionId]);
}

export async function placementReportRows(institutionId: string) {
  return query(
    `SELECT s.register_number AS "Register Number", s.name AS "Student", c.name AS "Company",
            rd.title AS "Drive", p.status AS "Status", p.package_lpa AS "Package (LPA)",
            p.is_internship AS "Internship"
       FROM placements p
       JOIN students s ON s.id = p.student_id
       JOIN companies c ON c.id = p.company_id
       JOIN recruitment_drives rd ON rd.id = p.drive_id
      WHERE p.institution_id = $1 ORDER BY p.created_at DESC`, [institutionId]);
}
