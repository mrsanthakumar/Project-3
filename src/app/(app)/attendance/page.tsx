"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { ResourceConfig } from "@/components/data/resource-types";

const STATUS = ["PRESENT", "ABSENT", "OD", "LEAVE"].map((v) => ({ value: v, label: v }));

const config: ResourceConfig<Record<string, unknown>> = {
  title: "Attendance",
  subtitle: "Daily attendance — bulk upload recommended for volume",
  basePath: "/attendance",
  bulkUpload: true,
  filters: [
    { name: "status", label: "Status", options: STATUS },
  ],
  columns: [
    { key: "attendanceDate", label: "Date" },
    { key: "status", label: "Status" },
    { key: "period", label: "Period" },
  ],
  fields: [
    { name: "studentId", label: "Student", type: "select", required: true, optionsFrom: { path: "/students?pageSize=100", labelKey: "registerNumber" } },
    { name: "subjectId", label: "Subject", type: "select", required: true, optionsFrom: { path: "/subjects?pageSize=100", labelKey: "code" } },
    { name: "attendanceDate", label: "Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS },
    { name: "period", label: "Period", type: "number" },
  ],
};

export default function AttendancePage() {
  return <ResourcePage config={config} />;
}
