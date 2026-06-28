import { z } from "zod";
import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { withTransaction } from "@/lib/db";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";

const markSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  attendanceDate: z.string().date(),
  status: z.enum(["PRESENT", "ABSENT", "OD", "LEAVE"]),
  period: z.number().int().min(1).max(12).optional(),
});
const bodySchema = z.object({ marks: z.array(markSchema).min(1).max(2000) });

/**
 * Save an attendance grid in one transaction. Upserts on the natural key so
 * re-saving a day corrects prior marks instead of erroring.
 */
export const POST = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "attendance.manage");
  const institutionId = resolveInstitutionScope(ctx, req);
  const { marks } = bodySchema.parse(await req.json());

  await withTransaction(async (client) => {
    for (const m of marks) {
      await client.query(
        `INSERT INTO attendance
           (institution_id, student_id, subject_id, attendance_date, status, period, marked_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (student_id, subject_id, attendance_date, period)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [institutionId, m.studentId, m.subjectId, m.attendanceDate, m.status, m.period ?? null, ctx.userId],
      );
    }
  });

  await recordAudit({
    institutionId, userId: ctx.userId, action: "CREATE", entity: "attendance",
    detail: { count: marks.length }, ip: clientIp(req),
  });

  return ok({ saved: marks.length });
});
