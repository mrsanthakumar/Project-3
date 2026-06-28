import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Returns the unified profile snapshot (Module 12) if the analytics engine
 * has built one; otherwise assembles a base profile live from students +
 * extra so the endpoint is useful before Phase 9 populates the snapshot.
 */
export const GET = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "analytics.read");
  const institutionId = resolveInstitutionScope(ctx, req);
  const studentId = params!.id;

  const snapshot = await queryOne(
    `SELECT * FROM unified_student_profiles WHERE student_id = $1 AND institution_id = $2`,
    [studentId, institutionId],
  );
  if (snapshot) return ok({ source: "snapshot", ...snapshot });

  const base = await queryOne(
    `SELECT s.id AS student_id, s.register_number, s.name, s.department_id, s.batch_id,
            s.admission_type, s.cutoff_mark, s.tenth_percentage, s.twelfth_percentage,
            s.diploma_percentage, s.current_cgpa, s.active_arrears, s.history_arrears,
            e.internship_count, e.certification_count, e.hackathon_count, e.coding_score
       FROM students s
       LEFT JOIN student_profiles_extra e ON e.student_id = s.id
      WHERE s.id = $1 AND s.institution_id = $2 AND s.deleted_at IS NULL`,
    [studentId, institutionId],
  );
  if (!base) throw new ApiError("NOT_FOUND", "Student not found");

  return ok({ source: "live", ...base });
});
