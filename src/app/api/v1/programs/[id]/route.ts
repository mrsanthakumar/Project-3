import { crudRoutes } from "@/lib/crud";
import { programResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(programResource).item;
