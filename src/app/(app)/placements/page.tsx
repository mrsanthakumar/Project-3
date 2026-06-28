"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const STATUS = ["ELIGIBLE", "APPLIED", "ATTENDED", "SELECTED", "REJECTED", "WITHDRAWN"].map((v) => ({ value: v, label: v }));

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Placements",
  subtitle: "Placement & internship records",
  basePath: "/placements",
  bulkUpload: true,
  filters: [{ name: "status", label: "Status", options: STATUS }],
  columns: [
    { key: "status", label: "Status" },
    { key: "applied", label: "Applied" },
    { key: "attended", label: "Attended" },
    { key: "selected", label: "Selected" },
    { key: "packageLpa", label: "Package (LPA)" },
  ],
  fields: [
    { name: "studentId", label: "Student", type: "select", required: true, optionsFrom: { path: "/students?pageSize=100", labelKey: "registerNumber" } },
    { name: "companyId", label: "Company", type: "select", required: true, optionsFrom: { path: "/companies?pageSize=100", labelKey: "name" } },
    { name: "driveId", label: "Drive", type: "select", required: true, optionsFrom: { path: "/recruitment-drives?pageSize=100", labelKey: "title" } },
    { name: "status", label: "Status", type: "select", options: STATUS },
    { name: "packageLpa", label: "Package (LPA)", type: "number" },
    { name: "applied", label: "Applied", type: "checkbox" },
    { name: "attended", label: "Attended", type: "checkbox" },
    { name: "selected", label: "Selected", type: "checkbox" },
    { name: "isInternship", label: "Internship", type: "checkbox" },
  ],
};

export default function PlacementsPage() {
  return <ResourcePage config={config} />;
}
