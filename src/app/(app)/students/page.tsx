"use client";

import Link from "next/link";
import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const GENDER = [
  { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" },
];
const ADMISSION = ["COUNSELING", "MANAGEMENT", "LATERAL_ENTRY", "SPORTS", "NRI"].map((v) => ({ value: v, label: v }));

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Students",
  subtitle: "Student master records",
  basePath: "/students",
  searchable: true,
  bulkUpload: true,
  permissionCreate: "student.create",
  filters: [
    { name: "department_id", label: "Department", optionsFrom: { path: "/departments?pageSize=100", labelKey: "code" } },
    { name: "status", label: "Status", options: [{ value: "ACTIVE", label: "Active" }, { value: "ALUMNI", label: "Alumni" }, { value: "DROPPED", label: "Dropped" }] },
  ],
  columns: [
    { key: "registerNumber", label: "Reg No" },
    { key: "name", label: "Name" },
    { key: "currentCgpa", label: "CGPA" },
    { key: "activeArrears", label: "Active Arr." },
    { key: "historyArrears", label: "Hist. Arr." },
    { key: "status", label: "Status" },
  ],
  fields: [
    { name: "registerNumber", label: "Register Number", type: "text", required: true, createOnly: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "gender", label: "Gender", type: "select", options: GENDER },
    { name: "dateOfBirth", label: "Date of Birth", type: "date" },
    { name: "email", label: "Email", type: "email" },
    { name: "mobile", label: "Mobile", type: "text" },
    { name: "tenthPercentage", label: "10th %", type: "number" },
    { name: "twelfthPercentage", label: "12th %", type: "number" },
    { name: "diplomaPercentage", label: "Diploma %", type: "number" },
    { name: "admissionType", label: "Admission Type", type: "select", options: ADMISSION },
    { name: "cutoffMark", label: "Cutoff Mark", type: "number" },
    { name: "departmentId", label: "Department", type: "select", optionsFrom: { path: "/departments?pageSize=100", labelKey: "name" } },
    { name: "regulationId", label: "Regulation", type: "select", optionsFrom: { path: "/regulations?pageSize=100", labelKey: "code" } },
    { name: "currentCgpa", label: "Current CGPA", type: "number" },
    { name: "activeArrears", label: "Active Arrears", type: "number" },
    { name: "historyArrears", label: "History Arrears", type: "number" },
  ],
  rowActions: (row) => (
    <Link href={`/students/${row.id}`} className="text-slate-500 hover:underline">View</Link>
  ),
};

export default function StudentsPage() {
  return <ResourcePage config={config} />;
}
