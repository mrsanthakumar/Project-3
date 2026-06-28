import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { env } from "@/lib/env";
import { query } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { buildExcel } from "@/lib/reports/excel";
import { buildPdf, type PdfSection } from "@/lib/reports/pdf";
import * as data from "@/lib/reports/data";

export type ReportType =
  | "ADMISSION" | "ACADEMIC" | "PLACEMENT" | "RISK" | "STUDENT" | "DEPARTMENT";
export type ReportFormat = "PDF" | "EXCEL";

const PDF_TYPES = new Set(["ADMISSION", "ACADEMIC", "PLACEMENT", "RISK"]);
const EXCEL_TYPES = new Set(["STUDENT", "DEPARTMENT", "PLACEMENT"]);

async function renderExcel(type: ReportType, institutionId: string): Promise<Buffer> {
  switch (type) {
    case "STUDENT": return buildExcel("Students", await data.studentReportRows(institutionId));
    case "DEPARTMENT": return buildExcel("Departments", await data.departmentReportRows(institutionId));
    case "PLACEMENT": return buildExcel("Placements", await data.placementReportRows(institutionId));
    default: throw new ApiError("UNPROCESSABLE", `Excel not supported for ${type}`);
  }
}

async function renderPdf(type: ReportType, institutionId: string): Promise<Buffer> {
  const stamp = new Date().toISOString().slice(0, 10);
  if (type === "ADMISSION") {
    const d = await data.admissionReportData(institutionId);
    const sections: PdfSection[] = [
      { heading: "Admission Trends", table: { columns: ["Year", "Count"], rows: d.trends.map((r) => [r.year as number, r.count as number]) } },
      { heading: "Branch Demand", table: { columns: ["Department", "Admissions"], rows: d.branchDemand.map((r) => [r.department as string, r.admissions as number]) } },
      { heading: "Gender Ratio", lines: d.gender.map((g) => ({ label: g.gender ?? "Unknown", value: g.count })) },
    ];
    return buildPdf("Admission Report", stamp, sections);
  }
  if (type === "ACADEMIC") {
    const d = await data.academicReportData(institutionId);
    return buildPdf("Academic Report", stamp, [
      { heading: "Overall", lines: [
        { label: "Pass Percentage", value: `${d.passPercentage}%` },
        { label: "Students with Arrears", value: d.arrears?.with_arrears ?? 0 },
        { label: "Clean Students", value: d.arrears?.clean ?? 0 },
      ] },
      { heading: "CGPA Trend", table: { columns: ["Semester", "Avg CGPA"], rows: d.cgpaTrend.map((r) => [r.semester as number, r.avg_cgpa as number]) } },
    ]);
  }
  if (type === "PLACEMENT") {
    const d = await data.placementReportData(institutionId);
    return buildPdf("Placement Report", stamp, [
      { heading: "Summary", lines: [
        { label: "Placement Percentage", value: `${d.placementPercentage}%` },
        { label: "Highest Package (LPA)", value: d.highestPackageLpa },
        { label: "Average Package (LPA)", value: d.averagePackageLpa },
      ] },
      { heading: "Department-wise Placement", table: { columns: ["Department", "Placed %"], rows: d.deptWise.map((r) => [r.department as string, (r.placed_pct as number) ?? 0]) } },
    ]);
  }
  // RISK
  const d = await data.riskReportData(institutionId);
  return buildPdf("Risk Report", stamp, [
    { heading: "Risk Distribution", lines: [
      { label: "Low", value: d.distribution.low },
      { label: "Medium", value: d.distribution.medium },
      { label: "High", value: d.distribution.high },
    ] },
    { heading: "High-Risk Students", table: {
      columns: ["Reg No", "Name", "Score", "CGPA", "Att%", "Arrears"],
      rows: d.highRisk.map((r) => [
        r.register_number as string, r.name as string, r.risk_score as number,
        (r.current_cgpa as number) ?? "-", (r.avg_attendance_pct as number) ?? "-", r.active_arrears as number,
      ]),
    } },
  ]);
}

/** Generate the file, persist it to disk, and mark the report job READY. */
export async function generateReportFile(
  jobId: string,
  institutionId: string,
  reportType: ReportType,
  format: ReportFormat,
): Promise<string> {
  if (format === "PDF" && !PDF_TYPES.has(reportType)) {
    throw new ApiError("UNPROCESSABLE", `PDF not supported for ${reportType}`);
  }
  if (format === "EXCEL" && !EXCEL_TYPES.has(reportType)) {
    throw new ApiError("UNPROCESSABLE", `Excel not supported for ${reportType}`);
  }

  try {
    const buffer = format === "EXCEL"
      ? await renderExcel(reportType, institutionId)
      : await renderPdf(reportType, institutionId);

    const ext = format === "EXCEL" ? "xlsx" : "pdf";
    const dir = join(env.reportsDir, institutionId);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${jobId}.${ext}`);
    await writeFile(filePath, buffer);

    await query(
      `UPDATE report_exports SET status='READY', file_path=$2, completed_at=now() WHERE id=$1`,
      [jobId, filePath],
    );
    return filePath;
  } catch (e) {
    await query(
      `UPDATE report_exports SET status='FAILED', error_message=$2, completed_at=now() WHERE id=$1`,
      [jobId, e instanceof Error ? e.message : "generation failed"],
    );
    throw e;
  }
}
