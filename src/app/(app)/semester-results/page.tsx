"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const RESULT = ["PASS", "FAIL", "ABSENT", "WITHHELD"].map((v) => ({ value: v, label: v }));

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Semester Results",
  subtitle: "Grades & results — saving recomputes CGPA and arrears",
  basePath: "/semester-results",
  bulkUpload: true,
  filters: [{ name: "result", label: "Result", options: RESULT }],
  columns: [
    { key: "semester", label: "Sem" },
    { key: "grade", label: "Grade" },
    { key: "gradePoints", label: "Points" },
    { key: "result", label: "Result" },
    { key: "creditsEarned", label: "Credits" },
  ],
  fields: [
    { name: "studentId", label: "Student", type: "select", required: true, optionsFrom: { path: "/students?pageSize=100", labelKey: "registerNumber" } },
    { name: "subjectId", label: "Subject", type: "select", required: true, optionsFrom: { path: "/subjects?pageSize=100", labelKey: "code" } },
    { name: "semester", label: "Semester", type: "number", required: true },
    { name: "grade", label: "Grade", type: "text", placeholder: "O / A+ / A …" },
    { name: "gradePoints", label: "Grade Points", type: "number" },
    { name: "result", label: "Result", type: "select", options: RESULT },
    { name: "creditsEarned", label: "Credits Earned", type: "number" },
  ],
};

export default function SemesterResultsPage() {
  return <ResourcePage config={config} />;
}
