import { handle } from "@/lib/http";
import { getAuthContext, requirePermission } from "@/lib/auth/context";

export const runtime = "nodejs";

/** Download a CSV import template with the expected student columns. */
export const GET = handle(async (req) => {
  const ctx = getAuthContext(req);
  requirePermission(ctx, "student.read");

  const headers = [
    "Register Number", "Student Name", "Gender", "Date of Birth", "Email", "Mobile",
    "10th Percentage", "12th Percentage", "Diploma Percentage", "Admission Type",
    "Cutoff Mark", "Department",
  ];
  const sample =
    "21CSE001,Anand R,Male,2003-05-12,anand@example.com,9000000000,88.5,91.2,,COUNSELING,192.5,CSE";
  const csv = `${headers.join(",")}\n${sample}\n`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="student_import_template.csv"',
    },
  });
});
