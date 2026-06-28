import { crudRoutes } from "@/lib/crud";
import { driveResource } from "@/lib/resources/recruitment";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(driveResource).collection;
