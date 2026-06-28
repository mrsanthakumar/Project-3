import { handle } from "@/lib/http";
import { runBulkUpload } from "@/lib/import/run";
import { importPlacements } from "@/lib/import/placements";

export const runtime = "nodejs";

export const POST = handle((req) =>
  runBulkUpload(req, { entity: "placements", permission: "placement.manage", importer: importPlacements }),
);
