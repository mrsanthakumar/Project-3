import { crudRoutes } from "@/lib/crud";
import { companyResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(companyResource).collection;
