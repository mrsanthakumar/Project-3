"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Companies",
  subtitle: "Recruiting companies",
  basePath: "/companies",
  searchable: true,
  columns: [
    { key: "name", label: "Name" },
    { key: "industry", label: "Industry" },
    { key: "tier", label: "Tier" },
    { key: "location", label: "Location" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "industry", label: "Industry", type: "text" },
    { name: "tier", label: "Tier", type: "text", placeholder: "TIER1" },
    { name: "website", label: "Website", type: "text" },
    { name: "location", label: "Location", type: "text" },
  ],
};

export default function CompaniesPage() {
  return <ResourcePage config={config} />;
}
