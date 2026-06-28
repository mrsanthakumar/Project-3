import { crudRoutes } from "@/lib/crud";
import { cohortResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(cohortResource).collection;
