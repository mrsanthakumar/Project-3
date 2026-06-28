import { z } from "zod";
import type { ResourceConfig } from "@/lib/crud";
import { zUuid } from "@/lib/crud";

const DRIVE_STATUS = ["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const APP_STATUS = ["ELIGIBLE", "APPLIED", "ATTENDED", "SELECTED", "REJECTED", "WITHDRAWN"] as const;

// ---------- Recruitment Drives (Module 10) ----------
export const driveResource: ResourceConfig = {
  table: "recruitment_drives",
  entity: "recruitment_drive",
  permissionView: "placement.read",
  permissionWrite: "drive.manage",
  searchable: ["title", "role"],
  filterable: { company_id: "company_id", status: "status" },
  sortable: { driveDate: "drive_date", createdAt: "created_at" },
  defaultSort: "created_at DESC",
  columns: [
    { api: "companyId", db: "company_id", insertable: true, updatable: true },
    { api: "title", db: "title", insertable: true, updatable: true },
    { api: "role", db: "role", insertable: true, updatable: true },
    { api: "driveDate", db: "drive_date", insertable: true, updatable: true },
    { api: "packageLpa", db: "package_lpa", insertable: true, updatable: true },
    { api: "isInternship", db: "is_internship", insertable: true, updatable: true },
    { api: "matchMode", db: "match_mode", insertable: true, updatable: true },
    { api: "status", db: "status", insertable: true, updatable: true },
    { api: "createdAt", db: "created_at" },
  ],
  createSchema: z.object({
    companyId: zUuid,
    title: z.string().min(1).max(200),
    role: z.string().max(160).optional(),
    driveDate: z.string().date().optional(),
    packageLpa: z.number().min(0).max(1000).optional(),
    isInternship: z.boolean().optional(),
    matchMode: z.enum(["ALL", "ANY"]).optional(),
    status: z.enum(DRIVE_STATUS).optional(),
  }),
  updateSchema: z
    .object({
      title: z.string().min(1).max(200),
      role: z.string().max(160),
      driveDate: z.string().date(),
      packageLpa: z.number().min(0).max(1000),
      isInternship: z.boolean(),
      matchMode: z.enum(["ALL", "ANY"]),
      status: z.enum(DRIVE_STATUS),
    })
    .partial(),
};

// ---------- Placements (Module 11) ----------
export const placementResource: ResourceConfig = {
  table: "placements",
  entity: "placement",
  permissionView: "placement.read",
  permissionWrite: "placement.manage",
  filterable: {
    drive_id: "drive_id",
    company_id: "company_id",
    student_id: "student_id",
    status: "status",
    selected: "selected",
  },
  sortable: { createdAt: "created_at", packageLpa: "package_lpa" },
  defaultSort: "created_at DESC",
  columns: [
    { api: "driveId", db: "drive_id", insertable: true, updatable: true },
    { api: "companyId", db: "company_id", insertable: true, updatable: true },
    { api: "studentId", db: "student_id", insertable: true, updatable: true },
    { api: "status", db: "status", insertable: true, updatable: true },
    { api: "applied", db: "applied", insertable: true, updatable: true },
    { api: "attended", db: "attended", insertable: true, updatable: true },
    { api: "selected", db: "selected", insertable: true, updatable: true },
    { api: "packageLpa", db: "package_lpa", insertable: true, updatable: true },
    { api: "isInternship", db: "is_internship", insertable: true, updatable: true },
    { api: "offerDate", db: "offer_date", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    driveId: zUuid,
    companyId: zUuid,
    studentId: zUuid,
    status: z.enum(APP_STATUS).optional(),
    applied: z.boolean().optional(),
    attended: z.boolean().optional(),
    selected: z.boolean().optional(),
    packageLpa: z.number().min(0).max(1000).optional(),
    isInternship: z.boolean().optional(),
    offerDate: z.string().date().optional(),
  }),
  updateSchema: z
    .object({
      status: z.enum(APP_STATUS),
      applied: z.boolean(),
      attended: z.boolean(),
      selected: z.boolean(),
      packageLpa: z.number().min(0).max(1000),
      isInternship: z.boolean(),
      offerDate: z.string().date(),
    })
    .partial(),
};
