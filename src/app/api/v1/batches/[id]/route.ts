import { crudRoutes } from "@/lib/crud";
import { batchResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(batchResource).item;
