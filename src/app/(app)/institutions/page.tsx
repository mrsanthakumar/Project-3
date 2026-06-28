"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Institutions",
  subtitle: "Tenant institutions (Super Admin)",
  basePath: "/institutions",
  searchable: true,
  columns: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "city", label: "City" },
    { key: "isActive", label: "Active" },
  ],
  fields: [
    { name: "code", label: "Code", type: "text", required: true, createOnly: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "city", label: "City", type: "text" },
    { name: "state", label: "State", type: "text" },
    { name: "country", label: "Country", type: "text" },
  ],
};

export default function InstitutionsPage() {
  return <ResourcePage config={config} />;
}
