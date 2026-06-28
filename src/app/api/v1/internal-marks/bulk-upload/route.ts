import { handle } from "@/lib/http";
import { runBulkUpload } from "@/lib/import/run";
import { importInternalMarks } from "@/lib/import/academic";

export const runtime = "nodejs";

export const POST = handle((req) =>
  runBulkUpload(req, { entity: "internal_marks", permission: "internal.manage", importer: importInternalMarks }),
);
