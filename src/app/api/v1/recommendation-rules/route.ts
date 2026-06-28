import { crudRoutes } from "@/lib/crud";
import { recommendationRuleResource } from "@/lib/resources/recommendation";

export const runtime = "nodejs";
export const { GET, POST } = crudRoutes(recommendationRuleResource).collection;
