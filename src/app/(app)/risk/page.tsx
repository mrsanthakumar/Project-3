"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { useListApi } from "@/lib/client/useListApi";
import { apiPost, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { Loading, ErrorState } from "@/components/ui/state";
import { DataTable } from "@/components/data/DataTable";

interface Config {
  ruleSet: { name: string } | null;
  rules: { category: string; metric: string; comparator: string; threshold: number; weight: number }[];
  bands: { level: string; minScore: number; maxScore: number }[];
}

const LEVEL_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-green-100 text-green-700",
};

export default function RiskPage() {
  const config = useApi<Config>("/risk/config");
  const [level, setLevel] = useState("");
  const students = useListApi<Record<string, unknown>>(`/risk/students${level ? `?filter[risk_level]=${level}` : ""}`);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function assess() {
    setBusy(true); setMsg(null);
    try {
      const s = await apiPost<{ assessed: number; high: number }>("/risk/assess");
      setMsg(`Assessed ${s.assessed} students — ${s.high} high risk`);
      students.reload();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Assessment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Risk Prediction" subtitle="Configurable academic / attendance / placement risk"
        actions={<Button onClick={assess} loading={busy}>Run Assessment</Button>} />

      {msg && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <div className="mb-6">
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Active Model {config.data?.ruleSet?.name && `— ${config.data.ruleSet.name}`}</h3>
          {config.loading && <Loading />}
          {config.error && <ErrorState message={config.error} onRetry={config.reload} />}
          {config.data && (
            <div className="flex flex-wrap gap-2 text-xs">
              {config.data.rules.map((r, i) => (
                <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {r.category}: {r.metric} {r.comparator} {r.threshold} (w{r.weight})
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        {["", "HIGH", "MEDIUM", "LOW"].map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            className={`rounded-lg px-3 py-1.5 text-sm ${level === l ? "bg-brand text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {l || "All"}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: "register_number", label: "Reg No" },
          { key: "name", label: "Name" },
          { key: "risk_level", label: "Level", render: (r) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[String(r.risk_level)] ?? ""}`}>{String(r.risk_level ?? "—")}</span>
          ) },
          { key: "risk_score", label: "Score" },
          { key: "current_cgpa", label: "CGPA" },
          { key: "avg_attendance_pct", label: "Att %" },
          { key: "active_arrears", label: "Arrears" },
        ]}
        rows={students.data}
        loading={students.loading}
        error={students.error}
        onRetry={students.reload}
      />
    </div>
  );
}
