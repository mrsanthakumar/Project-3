"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Users",
  subtitle: "Staff accounts & roles",
  basePath: "/users",
  searchable: true,
  permissionCreate: "user.create",
  idKey: "id",
  filters: [{ name: "role_id", label: "Role", optionsFrom: { path: "/roles", labelKey: "name" } }],
  columns: [
    { key: "fullName", label: "Name" },
    { key: "email", label: "Email" },
    { key: "roleName", label: "Role" },
    { key: "departmentCode", label: "Dept" },
    { key: "isActive", label: "Active" },
  ],
  fields: [
    { name: "fullName", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true, createOnly: true },
    { name: "password", label: "Password", type: "text", required: true, createOnly: true },
    { name: "roleId", label: "Role", type: "select", required: true, optionsFrom: { path: "/roles", labelKey: "name" } },
    { name: "departmentId", label: "Department", type: "select", optionsFrom: { path: "/departments?pageSize=100", labelKey: "name" } },
    { name: "phone", label: "Phone", type: "text" },
    { name: "isActive", label: "Active", type: "checkbox" },
  ],
};

export default function UsersPage() {
  return <ResourcePage config={config} />;
}
