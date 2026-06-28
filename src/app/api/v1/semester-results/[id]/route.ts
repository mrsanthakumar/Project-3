import { crudRoutes } from "@/lib/crud";
import { semesterResultResource } from "@/lib/resources/academic";

export const runtime = "nodejs";
// GET/PUT/DELETE via factory. (PUT/DELETE callers should re-run roll-up via a
// results re-import or the analytics refresh in Phase 9 for affected students.)
export const { GET, PUT, DELETE } = crudRoutes(semesterResultResource).item;
