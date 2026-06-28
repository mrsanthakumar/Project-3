import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/** Internal-marks analytics (Module 7): subject averages, top & weak students. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "internal.manage");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const dept = url.searchParams.get("filter[department_id]");
  const deptJoin = dept ? "AND st.department_id = $2" : "";
  const args: unknown[] = dept ? [institutionId, dept] : [institutionId];

  const [subjectAverages, topStudents, weakStudents] = await Promise.all([
    query(
      `SELECT sub.code AS subject_code, round(avg(im.internal_average), 2) AS avg
         FROM internal_marks im
         JOIN students st ON st.id = im.student_id
         JOIN subjects sub ON sub.id = im.subject_id
        WHERE im.institution_id = $1 ${deptJoin}
        GROUP BY sub.code ORDER BY avg DESC`,
      args,
    ),
    query(
      `SELECT st.register_number, st.name, round(avg(im.internal_average), 2) AS avg
         FROM internal_marks im JOIN students st ON st.id = im.student_id
        WHERE im.institution_id = $1 ${deptJoin}
        GROUP BY st.id, st.register_number, st.name
        ORDER BY avg DESC NULLS LAST LIMIT 10`,
      args,
    ),
    query(
      `SELECT st.register_number, st.name, round(avg(im.internal_average), 2) AS avg
         FROM internal_marks im JOIN students st ON st.id = im.student_id
        WHERE im.institution_id = $1 ${deptJoin}
        GROUP BY st.id, st.register_number, st.name
        ORDER BY avg ASC NULLS LAST LIMIT 10`,
      args,
    ),
  ]);

  return ok({ subjectAverages, topStudents, weakStudents });
});
