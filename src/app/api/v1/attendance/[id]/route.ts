import { crudRoutes } from "@/lib/crud";
import { attendanceResource } from "@/lib/resources/academic";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = crudRoutes(attendanceResource).item;
