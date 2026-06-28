import { crudRoutes } from "@/lib/crud";
import { studentResource } from "@/lib/resources/student";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(studentResource).item;
