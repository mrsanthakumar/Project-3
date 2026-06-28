import { crudRoutes } from "@/lib/crud";
import { handle, created, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { semesterResultResource } from "@/lib/resources/academic";
import { queryOne } from "@/lib/db";
import { recomputeStudentAcademics } from "@/lib/academic/rollup";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

// List comes straight from the factory.
export const GET = crudRoutes(semesterResultResource).collection.GET;

/**
 * Custom create: insert a result then recompute the student's GPA/CGPA and
 * arrear snapshot. (Factory create can't trigger the roll-up.)
 */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "result.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = semesterResultResource.createSchema.parse(await req.json()) as {
    studentId: string; subjectId: string; semester: number;
    grade?: string; gradePoints?: number; result?: string;
    creditsEarned?: number; isArrear?: boolean;
  };

  let row: { id: string } | null;
  try {
    row = await queryOne<{ id: string }>(
      `INSERT INTO semester_results
         (institution_id, student_id, subject_id, semester, grade, grade_points, result, credits_earned, is_arrear)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (student_id, subject_id, semester) DO UPDATE SET
         grade = EXCLUDED.grade, grade_points = EXCLUDED.grade_points,
         result = EXCLUDED.result, credits_earned = EXCLUDED.credits_earned,
         is_arrear = EXCLUDED.is_arrear
       RETURNING id`,
      [
        institutionId, body.studentId, body.subjectId, body.semester,
        body.grade ?? null, body.gradePoints ?? null, body.result ?? null,
        body.creditsEarned ?? null, body.isArrear ?? null,
      ],
    );
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "23503") throw new ApiError("UNPROCESSABLE", "Student or subject does not exist");
    throw e;
  }

  await recomputeStudentAcademics(body.studentId);

  await recordAudit({
    institutionId, userId: ctx.userId, action: "CREATE",
    entity: "semester_result", entityId: row!.id, detail: body, ip: clientIp(req),
  });

  return created({ id: row!.id });
});
