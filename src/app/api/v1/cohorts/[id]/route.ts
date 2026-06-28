import { crudRoutes } from "@/lib/crud";
import { cohortResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(cohortResource).item;
