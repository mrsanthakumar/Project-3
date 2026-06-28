"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Internal Marks",
  subtitle: "Test & assignment marks (average auto-computed)",
  basePath: "/internal-marks",
  bulkUpload: true,
  filters: [{ name: "semester", label: "Semester", options: Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Sem ${i + 1}` })) }],
  columns: [
    { key: "semester", label: "Sem" },
    { key: "test1", label: "Test 1" },
    { key: "test2", label: "Test 2" },
    { key: "assignment", label: "Assignment" },
    { key: "internalAverage", label: "Average" },
  ],
  fields: [
    { name: "studentId", label: "Student", type: "select", required: true, optionsFrom: { path: "/students?pageSize=100", labelKey: "registerNumber" } },
    { name: "subjectId", label: "Subject", type: "select", required: true, optionsFrom: { path: "/subjects?pageSize=100", labelKey: "code" } },
    { name: "semester", label: "Semester", type: "number" },
    { name: "test1", label: "Test 1", type: "number" },
    { name: "test2", label: "Test 2", type: "number" },
    { name: "assignment", label: "Assignment", type: "number" },
  ],
};

export default function InternalMarksPage() {
  return <ResourcePage config={config} />;
}
