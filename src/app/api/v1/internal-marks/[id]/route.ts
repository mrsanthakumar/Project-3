import { crudRoutes } from "@/lib/crud";
import { internalMarkResource } from "@/lib/resources/academic";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(internalMarkResource).item;
