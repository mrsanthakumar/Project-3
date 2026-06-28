import { crudRoutes } from "@/lib/crud";
import { branchResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(branchResource).collection;
