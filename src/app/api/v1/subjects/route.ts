import { crudRoutes } from "@/lib/crud";
import { subjectResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(subjectResource).collection;
