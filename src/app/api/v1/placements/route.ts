import { crudRoutes } from "@/lib/crud";
import { placementResource } from "@/lib/resources/recruitment";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(placementResource).collection;
