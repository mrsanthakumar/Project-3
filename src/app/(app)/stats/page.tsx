"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { apiPost, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { DataTable } from "@/components/data/DataTable";

const METRICS = [
  "tenth_percentage", "twelfth_percentage", "diploma_percentage", "current_cgpa",
  "avg_attendance_pct", "avg_internal", "cutoff_mark", "coding_score",
  "active_arrears", "history_arrears", "highest_package_lpa",
];

type TestType = "pearson" | "spearman" | "ttest" | "anova";

interface StatResult { testType: string; statistic: number; pValue: number; sampleSize: number; interpretation: string; }

function Sel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
      <option value="">— metric —</option>
      {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  );
}

export default function StatsPage() {
  const reports = useApi<Record<string, unknown>[]>("/stats/reports");
  const [test, setTest] = useState<TestType>("pearson");
  const [x, setX] = useState("twelfth_percentage");
  const [y, setY] = useState("current_cgpa");
  const [metric, setMetric] = useState("current_cgpa");
  const [result, setResult] = useState<StatResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrelation = test === "pearson" || test === "spearman";

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      const body = isCorrelation ? { x, y } : { metric };
      const res = await apiPost<StatResult>(`/stats/${test}`, body);
      setResult(res);
      reports.reload();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Statistical Validation" subtitle="Pearson · Spearman · T-Test · ANOVA (Python + SciPy)" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Run a Test</h3>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["pearson", "spearman", "ttest", "anova"] as TestType[]).map((t) => (
                <button key={t} onClick={() => { setTest(t); setResult(null); }}
                  className={`rounded-lg px-3 py-1.5 text-sm ${test === t ? "bg-brand text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {t}
                </button>
              ))}
            </div>

            {isCorrelation ? (
              <div className="flex items-center gap-2">
                <Sel value={x} onChange={setX} /><span className="text-slate-400">vs</span><Sel value={y} onChange={setY} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sel value={metric} onChange={setMetric} />
                <span className="text-xs text-slate-400">{test === "ttest" ? "grouped by placed vs not" : "across departments"}</span>
              </div>
            )}

            <Button onClick={run} loading={busy}>Run {test}</Button>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {result && (
              <div className="rounded-lg border border-slate-200 p-3 text-sm">
                <p>Statistic: <b>{result.statistic?.toFixed(4)}</b></p>
                <p>p-value: <b>{result.pValue?.toExponential(3)}</b></p>
                <p>Sample size: <b>{result.sampleSize}</b></p>
                <p className="mt-2 text-slate-600">{result.interpretation}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent Reports</h3>
          <DataTable
            columns={[
              { key: "test_type", label: "Test" },
              { key: "statistic", label: "Stat", render: (r) => Number(r.statistic).toFixed(3) },
              { key: "p_value", label: "p", render: (r) => Number(r.p_value).toExponential(2) },
              { key: "sample_size", label: "n" },
            ]}
            rows={reports.data ?? []}
            loading={reports.loading}
            error={reports.error}
            onRetry={reports.reload}
          />
        </Card>
      </div>
    </div>
  );
}
