"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { apiPost, apiDownload, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { DataTable } from "@/components/data/DataTable";

const PDF_TYPES = ["ADMISSION", "ACADEMIC", "PLACEMENT", "RISK"];
const EXCEL_TYPES = ["STUDENT", "DEPARTMENT", "PLACEMENT"];

export default function ReportsPage() {
  const history = useApi<Record<string, unknown>[]>("/reports");
  const [format, setFormat] = useState<"PDF" | "EXCEL">("PDF");
  const [reportType, setReportType] = useState("ADMISSION");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const types = format === "PDF" ? PDF_TYPES : EXCEL_TYPES;

  async function generate() {
    setBusy(true); setMsg(null);
    try {
      const res = await apiPost<{ jobId: string; downloadUrl: string }>("/reports", { reportType, format });
      setMsg("Report ready — downloading…");
      await apiDownload(res.downloadUrl, `${reportType.toLowerCase()}-report.${format === "PDF" ? "pdf" : "xlsx"}`);
      history.reload();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Report generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string, fmt: string) {
    await apiDownload(`/reports/${id}/download`, `report-${id}.${fmt === "PDF" ? "pdf" : "xlsx"}`);
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate PDF & Excel reports" />

      {msg && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Generate</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["PDF", "EXCEL"] as const).map((f) => (
                <button key={f} onClick={() => { setFormat(f); setReportType(f === "PDF" ? PDF_TYPES[0] : EXCEL_TYPES[0]); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${format === f ? "bg-brand text-white" : "border border-slate-300 text-slate-600"}`}>
                  {f}
                </button>
              ))}
            </div>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
            <Button onClick={generate} loading={busy} className="w-full">Generate & Download</Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">History</h3>
          <DataTable
            columns={[
              { key: "report_type", label: "Type" },
              { key: "format", label: "Format" },
              { key: "status", label: "Status" },
              { key: "requested_at", label: "Requested", render: (r) => new Date(String(r.requested_at)).toLocaleString() },
            ]}
            rows={history.data ?? []}
            loading={history.loading}
            error={history.error}
            onRetry={history.reload}
            rowActions={(r) => r.status === "READY"
              ? <button onClick={() => download(String(r.id), String(r.format))} className="text-brand hover:underline">Download</button>
              : <span className="text-slate-300">—</span>}
          />
        </Card>
      </div>
    </div>
  );
}
