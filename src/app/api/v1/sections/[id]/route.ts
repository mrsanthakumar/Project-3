import { crudRoutes } from "@/lib/crud";
import { sectionResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(sectionResource).item;
