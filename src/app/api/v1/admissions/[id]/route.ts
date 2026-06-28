import { crudRoutes } from "@/lib/crud";
import { admissionResource } from "@/lib/resources/student";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(admissionResource).item;
