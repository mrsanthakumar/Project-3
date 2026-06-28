import { crudRoutes } from "@/lib/crud";
import { regulationResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(regulationResource).collection;
