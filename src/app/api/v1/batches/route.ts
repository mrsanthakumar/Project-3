import { crudRoutes } from "@/lib/crud";
import { batchResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(batchResource).collection;
