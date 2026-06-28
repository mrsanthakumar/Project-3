import { crudRoutes } from "@/lib/crud";
import { regulationResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(regulationResource).item;
