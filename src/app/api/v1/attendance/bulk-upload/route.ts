import { handle } from "@/lib/http";
import { runBulkUpload } from "@/lib/import/run";
import { importAttendance } from "@/lib/import/academic";

export const runtime = "nodejs";

export const POST = handle((req) =>
  runBulkUpload(req, { entity: "attendance", permission: "attendance.manage", importer: importAttendance }),
);
