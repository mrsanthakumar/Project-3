import { crudRoutes } from "@/lib/crud";
import { departmentResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(departmentResource).item;
