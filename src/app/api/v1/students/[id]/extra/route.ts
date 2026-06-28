import { z } from "zod";
import { handle, ok, ApiError } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query, queryOne } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  internshipCount: z.number().int().min(0).optional(),
  certificationCount: z.number().int().min(0).optional(),
  hackathonCount: z.number().int().min(0).optional(),
  codingScore: z.number().min(0).optional(),
});

/** Upsert the employability/extracurricular profile (Module 3, feeds eligibility). */
export const PUT = handle(async (req, { params }) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "student.update");
  const institutionId = resolveInstitutionScope(ctx, req);
  const body = schema.parse(await req.json());
  const studentId = params!.id;

  // Confirm the student belongs to the caller's tenant.
  const student = await queryOne<{ id: string }>(
    `SELECT id FROM students WHERE id = $1 AND institution_id = $2 AND deleted_at IS NULL`,
    [studentId, institutionId],
  );
  if (!student) throw new ApiError("NOT_FOUND", "Student not found");

  const row = await queryOne(
    `INSERT INTO student_profiles_extra
       (student_id, institution_id, internship_count, certification_count, hackathon_count, coding_score)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (student_id) DO UPDATE SET
       internship_count    = COALESCE($3, student_profiles_extra.internship_count),
       certification_count = COALESCE($4, student_profiles_extra.certification_count),
       hackathon_count     = COALESCE($5, student_profiles_extra.hackathon_count),
       coding_score        = COALESCE($6, student_profiles_extra.coding_score),
       updated_at = now()
     RETURNING student_id, internship_count, certification_count, hackathon_count, coding_score`,
    [
      studentId, institutionId,
      body.internshipCount ?? null, body.certificationCount ?? null,
      body.hackathonCount ?? null, body.codingScore ?? null,
    ],
  );

  await recordAudit({
    institutionId, userId: ctx.userId, action: "UPDATE",
    entity: "student_profiles_extra", entityId: studentId, detail: body, ip: clientIp(req),
  });

  return ok({
    studentId,
    internshipCount: row!.internship_count,
    certificationCount: row!.certification_count,
    hackathonCount: row!.hackathon_count,
    codingScore: row!.coding_score,
  });
});
