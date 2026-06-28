import { handle } from "@/lib/http";
import { runBulkUpload } from "@/lib/import/run";
import { importSemesterResults } from "@/lib/import/academic";

export const runtime = "nodejs";

export const POST = handle((req) =>
  runBulkUpload(req, { entity: "semester_results", permission: "result.manage", importer: importSemesterResults }),
);
