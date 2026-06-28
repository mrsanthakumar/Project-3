import { withTransaction } from "@/lib/db";

/**
 * Recompute a student's per-semester GPA, cumulative CGPA, and arrear counts
 * from semester_results, then sync the rolling snapshot on students.
 *
 *   GPA(sem)  = Σ(grade_points × credits) / Σ(credits)   over that semester
 *   CGPA(sem) = same, cumulative across all semesters ≤ sem
 *   credits come from subjects.credits (falls back to results.credits_earned)
 *
 * active_arrears  = subjects whose latest attempt is FAIL
 * history_arrears = total result rows flagged is_arrear
 */
export async function recomputeStudentAcademics(studentId: string): Promise<void> {
  await withTransaction(async (client) => {
    // Per-semester weighted points and credits.
    const { rows: sems } = await client.query<{
      semester: number;
      points: string;
      credits: string;
    }>(
      `SELECT sr.semester,
              COALESCE(SUM(sr.grade_points * COALESCE(s.credits, sr.credits_earned, 0)), 0) AS points,
              COALESCE(SUM(COALESCE(s.credits, sr.credits_earned, 0)), 0) AS credits
         FROM semester_results sr
         LEFT JOIN subjects s ON s.id = sr.subject_id
        WHERE sr.student_id = $1
        GROUP BY sr.semester
        ORDER BY sr.semester`,
      [studentId],
    );

    let cumPoints = 0;
    let cumCredits = 0;
    let latestCgpa: number | null = null;

    for (const row of sems) {
      const points = Number(row.points);
      const credits = Number(row.credits);
      const gpa = credits > 0 ? points / credits : 0;
      cumPoints += points;
      cumCredits += credits;
      const cgpa = cumCredits > 0 ? cumPoints / cumCredits : 0;
      latestCgpa = cgpa;

      await client.query(
        `INSERT INTO semester_gpa
           (institution_id, student_id, semester, gpa, cgpa, credits_registered, credits_earned)
         SELECT institution_id, $1, $2, $3, $4, $5, $5 FROM students WHERE id = $1
         ON CONFLICT (student_id, semester) DO UPDATE
           SET gpa = EXCLUDED.gpa, cgpa = EXCLUDED.cgpa,
               credits_registered = EXCLUDED.credits_registered,
               credits_earned = EXCLUDED.credits_earned`,
        [studentId, row.semester, round2(gpa), round2(cgpa), credits],
      );
    }

    // Arrear counts.
    const { rows: arr } = await client.query<{ active: string; history: string }>(
      `WITH latest AS (
         SELECT DISTINCT ON (subject_id) subject_id, result
           FROM semester_results
          WHERE student_id = $1
          ORDER BY subject_id, semester DESC
       )
       SELECT
         (SELECT count(*) FROM latest WHERE result = 'FAIL')::int AS active,
         (SELECT count(*) FROM semester_results WHERE student_id = $1 AND is_arrear = TRUE)::int AS history`,
      [studentId],
    );

    await client.query(
      `UPDATE students
          SET current_cgpa = $2, active_arrears = $3, history_arrears = $4, updated_at = now()
        WHERE id = $1`,
      [
        studentId,
        latestCgpa != null ? round2(latestCgpa) : null,
        Number(arr[0]?.active ?? 0),
        Number(arr[0]?.history ?? 0),
      ],
    );
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;
