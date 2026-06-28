import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Student journey (Module 13): the admission → academics → placement timeline
 * for one student, assembled from the unified profile, semester GPA trend, and
 * placement offers.
 */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "analytics.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  const studentId = params!.studentId;

  const profile = await queryOne(
    `SELECT s.register_number, s.name, u.*
       FROM students s
       LEFT JOIN unified_student_profiles u ON u.student_id = s.id
      WHERE s.id = $1 AND s.institution_id = $2 AND s.deleted_at IS NULL`,
    [studentId, institutionId],
  );
  if (!profile) throw new ApiError("NOT_FOUND", "Student not found");

  const [admission, gpaTrend, offers] = await Promise.all([
    queryOne(
      `SELECT admission_year, admission_type, cutoff_mark, school_name, district
         FROM admissions WHERE student_id = $1 ORDER BY admission_year DESC LIMIT 1`,
      [studentId],
    ),
    query(
      `SELECT semester, gpa, cgpa FROM semester_gpa WHERE student_id = $1 ORDER BY semester`,
      [studentId],
    ),
    query(
      `SELECT c.name AS company, p.status, p.package_lpa, p.is_internship, p.offer_date
         FROM placements p JOIN companies c ON c.id = p.company_id
        WHERE p.student_id = $1 ORDER BY p.offer_date NULLS LAST`,
      [studentId],
    ),
  ]);

  return ok({
    student: { id: studentId, registerNumber: profile.register_number, name: profile.name },
    admission,
    academics: { gpaTrend, currentCgpa: profile.current_cgpa, avgAttendance: profile.avg_attendance_pct },
    placement: { isPlaced: profile.is_placed ?? false, highestPackageLpa: profile.highest_package_lpa, offers },
  });
});
