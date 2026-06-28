"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const ADMISSION = ["COUNSELING", "MANAGEMENT", "LATERAL_ENTRY", "SPORTS", "NRI"].map((v) => ({ value: v, label: v }));

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Admissions",
  subtitle: "Admission records & quotas",
  basePath: "/admissions",
  searchable: true,
  bulkUpload: true,
  filters: [
    { name: "department_id", label: "Department", optionsFrom: { path: "/departments?pageSize=100", labelKey: "code" } },
  ],
  columns: [
    { key: "admissionYear", label: "Year" },
    { key: "admissionType", label: "Type" },
    { key: "district", label: "District" },
    { key: "cutoffMark", label: "Cutoff" },
  ],
  fields: [
    { name: "admissionYear", label: "Admission Year", type: "number", required: true },
    { name: "admissionType", label: "Admission Type", type: "select", options: ADMISSION },
    { name: "departmentId", label: "Department", type: "select", optionsFrom: { path: "/departments?pageSize=100", labelKey: "name" } },
    { name: "cutoffMark", label: "Cutoff Mark", type: "number" },
    { name: "schoolName", label: "School Name", type: "text" },
    { name: "district", label: "District", type: "text" },
    { name: "state", label: "State", type: "text" },
    { name: "isManagementQuota", label: "Management Quota", type: "checkbox" },
    { name: "isCounselingQuota", label: "Counseling Quota", type: "checkbox" },
    { name: "isLateralEntry", label: "Lateral Entry", type: "checkbox" },
  ],
};

export default function AdmissionsPage() {
  return <ResourcePage config={config} />;
}