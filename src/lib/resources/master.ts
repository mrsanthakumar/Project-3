import { z } from "zod";
import type { ResourceConfig } from "@/lib/crud";
import { zUuid } from "@/lib/crud";

/**
 * Declarative configs for the master/org modules (Modules 2, 5, 9).
 * Each is consumed by crudRoutes() in the matching route handler.
 */

// ---------- Institutions (Module 20) — Super Admin only ----------
export const institutionResource: ResourceConfig = {
  table: "institutions",
  entity: "institution",
  permissionView: "institution.manage",
  permissionWrite: "institution.manage",
  searchable: ["code", "name", "city"],
  filterable: { is_active: "is_active", state: "state" },
  sortable: { code: "code", name: "name", createdAt: "created_at" },
  defaultSort: "name ASC",
  columns: [
    { api: "code", db: "code", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "address", db: "address", insertable: true, updatable: true },
    { api: "city", db: "city", insertable: true, updatable: true },
    { api: "state", db: "state", insertable: true, updatable: true },
    { api: "country", db: "country", insertable: true, updatable: true },
    { api: "logoUrl", db: "logo_url", insertable: true, updatable: true },
    { api: "isActive", db: "is_active", insertable: true, updatable: true },
    { api: "createdAt", db: "created_at" },
  ],
  createSchema: z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(255),
    address: z.string().optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    logoUrl: z.string().url().optional(),
  }),
  updateSchema: z
    .object({
      name: z.string().min(1).max(255),
      address: z.string(),
      city: z.string().max(120),
      state: z.string().max(120),
      country: z.string().max(120),
      logoUrl: z.string().url(),
      isActive: z.boolean(),
    })
    .partial(),
};

// ---------- Departments (Module 2) ----------
export const departmentResource: ResourceConfig = {
  table: "departments",
  entity: "department",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  softDelete: true,
  searchable: ["code", "name"],
  filterable: { code: "code", is_active: "is_active" },
  sortable: { code: "code", name: "name", createdAt: "created_at" },
  defaultSort: "code ASC",
  columns: [
    { api: "code", db: "code", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "hodUserId", db: "hod_user_id", insertable: true, updatable: true },
    { api: "isActive", db: "is_active", insertable: true, updatable: true },
    { api: "createdAt", db: "created_at" },
  ],
  createSchema: z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(160),
    hodUserId: zUuid.optional(),
    isActive: z.boolean().optional(),
  }),
  updateSchema: z
    .object({
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(160),
      hodUserId: zUuid.nullable(),
      isActive: z.boolean(),
    })
    .partial(),
};

// ---------- Programs (Module 2) ----------
export const programResource: ResourceConfig = {
  table: "programs",
  entity: "program",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  searchable: ["code", "name"],
  filterable: { department_id: "department_id", level: "level" },
  sortable: { code: "code", name: "name" },
  defaultSort: "code ASC",
  columns: [
    { api: "departmentId", db: "department_id", insertable: true, updatable: true },
    { api: "code", db: "code", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "durationYears", db: "duration_years", insertable: true, updatable: true },
    { api: "level", db: "level", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    departmentId: zUuid,
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(160),
    durationYears: z.number().positive().max(10).optional(),
    level: z.enum(["UG", "PG"]).optional(),
  }),
  updateSchema: z
    .object({
      code: z.string().min(1).max(30),
      name: z.string().min(1).max(160),
      durationYears: z.number().positive().max(10),
      level: z.enum(["UG", "PG"]),
    })
    .partial(),
};

// ---------- Branches (Module 2) ----------
export const branchResource: ResourceConfig = {
  table: "branches",
  entity: "branch",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  searchable: ["code", "name"],
  filterable: { program_id: "program_id" },
  sortable: { code: "code", name: "name" },
  defaultSort: "code ASC",
  columns: [
    { api: "programId", db: "program_id", insertable: true, updatable: true },
    { api: "code", db: "code", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    programId: zUuid,
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(160),
  }),
  updateSchema: z
    .object({ code: z.string().min(1).max(30), name: z.string().min(1).max(160) })
    .partial(),
};

// ---------- Regulations (Module 2) ----------
export const regulationResource: ResourceConfig = {
  table: "regulations",
  entity: "regulation",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  searchable: ["code", "name"],
  sortable: { code: "code", effectiveYear: "effective_year" },
  defaultSort: "effective_year DESC",
  columns: [
    { api: "code", db: "code", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "effectiveYear", db: "effective_year", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    code: z.string().min(1).max(30),
    name: z.string().max(120).optional(),
    effectiveYear: z.number().int().min(1980).max(2100).optional(),
  }),
  updateSchema: z
    .object({
      code: z.string().min(1).max(30),
      name: z.string().max(120),
      effectiveYear: z.number().int().min(1980).max(2100),
    })
    .partial(),
};

// ---------- Cohorts (Module 2) ----------
export const cohortResource: ResourceConfig = {
  table: "cohorts",
  entity: "cohort",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  searchable: ["label"],
  filterable: { admission_year: "admission_year" },
  sortable: { admissionYear: "admission_year" },
  defaultSort: "admission_year DESC",
  columns: [
    { api: "admissionYear", db: "admission_year", insertable: true, updatable: true },
    { api: "graduationYear", db: "graduation_year", insertable: true, updatable: true },
    { api: "label", db: "label", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    admissionYear: z.number().int().min(1980).max(2100),
    graduationYear: z.number().int().min(1980).max(2100).optional(),
    label: z.string().max(60).optional(),
  }),
  updateSchema: z
    .object({
      graduationYear: z.number().int().min(1980).max(2100),
      label: z.string().max(60),
    })
    .partial(),
};

// ---------- Batches (Module 2) ----------
export const batchResource: ResourceConfig = {
  table: "batches",
  entity: "batch",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  searchable: ["name"],
  filterable: {
    department_id: "department_id",
    cohort_id: "cohort_id",
    is_active: "is_active",
  },
  sortable: { name: "name" },
  defaultSort: "name ASC",
  columns: [
    { api: "departmentId", db: "department_id", insertable: true, updatable: true },
    { api: "programId", db: "program_id", insertable: true, updatable: true },
    { api: "branchId", db: "branch_id", insertable: true, updatable: true },
    { api: "cohortId", db: "cohort_id", insertable: true, updatable: true },
    { api: "regulationId", db: "regulation_id", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "currentSemester", db: "current_semester", insertable: true, updatable: true },
    { api: "isActive", db: "is_active", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    departmentId: zUuid,
    cohortId: zUuid,
    programId: zUuid.optional(),
    branchId: zUuid.optional(),
    regulationId: zUuid.optional(),
    name: z.string().min(1).max(120),
    currentSemester: z.number().int().min(1).max(12).optional(),
  }),
  updateSchema: z
    .object({
      programId: zUuid.nullable(),
      branchId: zUuid.nullable(),
      regulationId: zUuid.nullable(),
      name: z.string().min(1).max(120),
      currentSemester: z.number().int().min(1).max(12),
      isActive: z.boolean(),
    })
    .partial(),
};

// ---------- Sections (Module 2) ----------
export const sectionResource: ResourceConfig = {
  table: "sections",
  entity: "section",
  permissionView: "department.crud",
  permissionWrite: "department.crud",
  filterable: { batch_id: "batch_id" },
  sortable: { name: "name" },
  defaultSort: "name ASC",
  columns: [
    { api: "batchId", db: "batch_id", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "advisorUserId", db: "advisor_user_id", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    batchId: zUuid,
    name: z.string().min(1).max(10),
    advisorUserId: zUuid.optional(),
  }),
  updateSchema: z
    .object({ name: z.string().min(1).max(10), advisorUserId: zUuid.nullable() })
    .partial(),
};

// ---------- Subjects (Module 5) ----------
export const subjectResource: ResourceConfig = {
  table: "subjects",
  entity: "subject",
  permissionView: "subject.crud",
  permissionWrite: "subject.crud",
  searchable: ["code", "name"],
  filterable: {
    department_id: "department_id",
    semester: "semester",
    regulation_id: "regulation_id",
  },
  sortable: { code: "code", semester: "semester" },
  defaultSort: "semester ASC, code ASC",
  columns: [
    { api: "departmentId", db: "department_id", insertable: true, updatable: true },
    { api: "regulationId", db: "regulation_id", insertable: true, updatable: true },
    { api: "code", db: "code", insertable: true, updatable: true },
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "credits", db: "credits", insertable: true, updatable: true },
    { api: "semester", db: "semester", insertable: true, updatable: true },
    { api: "facultyUserId", db: "faculty_user_id", insertable: true, updatable: true },
    { api: "isActive", db: "is_active", insertable: true, updatable: true },
  ],
  createSchema: z.object({
    departmentId: zUuid,
    regulationId: zUuid.optional(),
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(200),
    credits: z.number().min(0).max(20).optional(),
    semester: z.number().int().min(1).max(12),
    facultyUserId: zUuid.optional(),
  }),
  updateSchema: z
    .object({
      regulationId: zUuid.nullable(),
      code: z.string().min(1).max(30),
      name: z.string().min(1).max(200),
      credits: z.number().min(0).max(20),
      semester: z.number().int().min(1).max(12),
      facultyUserId: zUuid.nullable(),
      isActive: z.boolean(),
    })
    .partial(),
};

// ---------- Companies (Module 9) ----------
export const companyResource: ResourceConfig = {
  table: "companies",
  entity: "company",
  permissionView: "company.crud",
  permissionWrite: "company.crud",
  searchable: ["name", "industry"],
  filterable: { tier: "tier", industry: "industry" },
  sortable: { name: "name", createdAt: "created_at" },
  defaultSort: "name ASC",
  columns: [
    { api: "name", db: "name", insertable: true, updatable: true },
    { api: "industry", db: "industry", insertable: true, updatable: true },
    { api: "tier", db: "tier", insertable: true, updatable: true },
    { api: "website", db: "website", insertable: true, updatable: true },
    { api: "location", db: "location", insertable: true, updatable: true },
    { api: "createdAt", db: "created_at" },
  ],
  createSchema: z.object({
    name: z.string().min(1).max(200),
    industry: z.string().max(120).optional(),
    tier: z.string().max(20).optional(),
    website: z.string().url().max(255).optional(),
    location: z.string().max(160).optional(),
  }),
  updateSchema: z
    .object({
      name: z.string().min(1).max(200),
      industry: z.string().max(120),
      tier: z.string().max(20),
      website: z.string().url().max(255),
      location: z.string().max(160),
    })
    .partial(),
};
