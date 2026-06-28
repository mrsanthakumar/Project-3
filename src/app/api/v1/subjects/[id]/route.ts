import { crudRoutes } from "@/lib/crud";
import { subjectResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(subjectResource).item;
