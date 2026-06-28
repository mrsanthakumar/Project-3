import { crudRoutes } from "@/lib/crud";
import { sectionResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(sectionResource).collection;
