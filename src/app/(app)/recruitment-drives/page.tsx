"use client";

import Link from "next/link";
import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const STATUS = ["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((v) => ({ value: v, label: v }));

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Recruitment Drives",
  subtitle: "Drives with dynamic eligibility criteria",
  basePath: "/recruitment-drives",
  searchable: true,
  permissionCreate: "drive.manage",
  filters: [{ name: "status", label: "Status", options: STATUS }],
  columns: [
    { key: "title", label: "Title" },
    { key: "role", label: "Role" },
    { key: "packageLpa", label: "Package (LPA)" },
    { key: "matchMode", label: "Match" },
    { key: "status", label: "Status" },
  ],
  fields: [
    { name: "companyId", label: "Company", type: "select", required: true, optionsFrom: { path: "/companies?pageSize=100", labelKey: "name" } },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "role", label: "Role", type: "text" },
    { name: "driveDate", label: "Drive Date", type: "date" },
    { name: "packageLpa", label: "Package (LPA)", type: "number" },
    { name: "matchMode", label: "Match Mode", type: "select", options: [{ value: "ALL", label: "ALL (AND)" }, { value: "ANY", label: "ANY (OR)" }] },
    { name: "status", label: "Status", type: "select", options: STATUS },
    { name: "isInternship", label: "Internship", type: "checkbox" },
  ],
  rowActions: (row) => (
    <Link href={`/recruitment-drives/${row.id}`} className="font-medium text-brand hover:underline">Manage</Link>
  ),
};

export default function RecruitmentDrivesPage() {
  return <ResourcePage config={config} />;
}
