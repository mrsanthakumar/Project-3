import { handle, ok } from "@/lib/http";
import { getAuthContext, requirePermission, resolveInstitutionScope } from "@/lib/auth/context";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admission-to-placement funnel (Module 13): admitted → retained → applied →
 * selected, with the overall admitted→placed conversion. Optional
 * ?filter[cohort_id] or ?filter[department_id] scoping.
 */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "analytics.read");
  const institutionId = resolveInstitutionScope(ctx, req);

  const url = new URL(req.url);
  const cohort = url.searchParams.get("filter[cohort_id]");
  const dept = url.searchParams.get("filter[department_id]");
  const where: string[] = ["u.institution_id = $1"];
  const args: unknown[] = [institutionId];
  if (cohort) { args.push(cohort); where.push(`u.cohort_id = $${args.length}`); }
  if (dept) { args.push(dept); where.push(`u.department_id = $${args.length}`); }
  const scope = where.join(" AND ");

  const row = await queryOne<{
    admitted: number; retained: number; applied: number; selected: number;
  }>(
    `SELECT
       count(*)::int AS admitted,
       count(*) FILTER (WHERE s.status = 'ACTIVE')::int AS retained,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM placements p WHERE p.student_id = u.student_id AND p.applied))::int AS applied,
       count(*) FILTER (WHERE u.is_placed)::int AS selected
     FROM unified_student_profiles u
     JOIN students s ON s.id = u.student_id
     WHERE ${scope}`,
    args,
  );

  const admitted = Number(row?.admitted ?? 0);
  const selected = Number(row?.selected ?? 0);

  return ok({
    admitted,
    retained: Number(row?.retained ?? 0),
    applied: Number(row?.applied ?? 0),
    selected,
    conversion: { admittedToPlaced: admitted ? Math.round((selected / admitted) * 10000) / 10000 : 0 },
  });
});
