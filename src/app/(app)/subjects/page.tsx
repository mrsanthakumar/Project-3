"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Subjects",
  subtitle: "Curriculum subjects",
  basePath: "/subjects",
  searchable: true,
  filters: [
    { name: "department_id", label: "Department", optionsFrom: { path: "/departments?pageSize=100", labelKey: "code" } },
  ],
  columns: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "credits", label: "Credits" },
    { key: "semester", label: "Sem" },
  ],
  fields: [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "departmentId", label: "Department", type: "select", required: true, optionsFrom: { path: "/departments?pageSize=100", labelKey: "name" } },
    { name: "regulationId", label: "Regulation", type: "select", optionsFrom: { path: "/regulations?pageSize=100", labelKey: "code" } },
    { name: "credits", label: "Credits", type: "number" },
    { name: "semester", label: "Semester", type: "number", required: true },
  ],
};

export default function SubjectsPage() {
  return <ResourcePage config={config} />;
}
