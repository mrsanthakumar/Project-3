import { crudRoutes } from "@/lib/crud";
import { internalMarkResource } from "@/lib/resources/academic";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(internalMarkResource).collection;
