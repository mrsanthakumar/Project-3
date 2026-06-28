import { z } from "zod";
import type { ResourceConfig } from "@/lib/crud";

const COMPARATORS = ["GTE", "LTE", "GT", "LT", "EQ", "NEQ"] as const;
const conditionSchema = z.object({
  metric: z.string().min(1).max(60),
  comparator: z.enum(COMPARATORS),
  value: z.number(),
});

// ---------- Recommendation Rules (Module 16) ----------
export const recommendationRuleResource: ResourceConfig = {
  table: "recommendation_rules",
  entity: "recommendation_rule",
  permissionView: "recommendation.manage",
  permissionWrite: "recommendation.manage",
  searchable: ["name", "action_text"],
  filterable: { scope_level: "scope_level", is_active: "is_active" },
  sortable: { priority: "priority", createdAt: "created_at" },
  defaultSort: "priority ASC",
  columns: [
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "scopeLevel", db: "scope_level", insertable: true, updatable: true },
    { api: "conditions", db: "conditions", insertable: true, updatable: true },
    { api: "logic", db: "logic", insertable: true, updatable: true },
    { api: "actionText", db: "action_text", insertable: true, updatable: true },
    { api: "priority", db: "priority", insertable: true, updatable: true },
    { api: "isActive", db: "is_active", insertable: true, updatable: true },
    { api: "createdAt", db: "created_at" },
  ],
  // conditions is jsonb — serialise to a JSON string for pg.
  jsonColumns: ["conditions"],
  createSchema: z.object({
    name: z.string().min(1).max(160),
    scopeLevel: z.enum(["STUDENT", "DEPARTMENT", "INSTITUTION"]),
    conditions: z.array(conditionSchema).min(1),
    logic: z.enum(["ALL", "ANY"]).optional(),
    actionText: z.string().min(1),
    priority: z.number().int().min(1).max(5).optional(),
  }),
  updateSchema: z
    .object({
      name: z.string().min(1).max(160),
      scopeLevel: z.enum(["STUDENT", "DEPARTMENT", "INSTITUTION"]),
      conditions: z.array(conditionSchema).min(1),
      logic: z.enum(["ALL", "ANY"]),
      actionText: z.string().min(1),
      priority: z.number().int().min(1).max(5),
      isActive: z.boolean(),
    })
    .partial(),
};
