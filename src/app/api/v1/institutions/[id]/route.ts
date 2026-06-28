import { crudRoutes } from "@/lib/crud";
import { institutionResource } from "@/lib/resources/master";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(institutionResource).item;
