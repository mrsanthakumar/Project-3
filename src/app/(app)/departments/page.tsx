"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Departments",
  subtitle: "Academic departments",
  basePath: "/departments",
  searchable: true,
  columns: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "isActive", label: "Active" },
  ],
  fields: [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
  ],
};

export default function DepartmentsPage() {
  return <ResourcePage config={config} />;
}
