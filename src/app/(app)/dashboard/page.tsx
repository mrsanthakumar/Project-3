"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { apiPost, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card, PageHeader } from "@/components/ui";
import { Loading, ErrorState } from "@/components/ui/state";
import { BarChart, LineChart, PieChart, FunnelChart } from "@/components/charts";

interface ExecutiveData {
  kpis: {
    totalStudents: number; passPercentage: number; placementPercentage: number;
    averageCgpa: number; highestPackageLpa: number; riskStudents: number;
  };
  admissionTrend: { year: number; count: number }[];
  charts: {
    placementByDept: { department: string; placed_pct: number | null }[];
    riskDistribution: { LOW: number; MEDIUM: number; HIGH: number };
    admissionToPlacementFunnel: { admitted: number; applied: number; selected: number };
  };
  topRecommendations: { action_text: string; scope_level: string; priority: number; count: number }[];
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</span>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi<ExecutiveData>("/dashboard/executive");
  const { can } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refreshData() {
    setRefreshing(true);
    setMsg(null);
    try {
      // Rebuild the unified read model, then re-score risk so the dashboard reflects current data.
      await apiPost("/analytics/refresh");
      if (can("risk.read")) await apiPost("/risk/assess");
      setMsg("Analytics refreshed");
      reload();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="Admission → Academics → Placement at a glance"
        actions={can("analytics.read") && <Button onClick={refreshData} loading={refreshing}>Refresh Data</Button>}
      />

      {msg && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Total Students" value={data.kpis.totalStudents} />
            <Kpi label="Pass %" value={`${data.kpis.passPercentage}%`} accent="text-green-600" />
            <Kpi label="Placement %" value={`${data.kpis.placementPercentage}%`} accent="text-brand" />
            <Kpi label="Avg CGPA" value={data.kpis.averageCgpa} />
            <Kpi label="Highest Package" value={`${data.kpis.highestPackageLpa} LPA`} accent="text-amber-600" />
            <Kpi label="Risk Students" value={data.kpis.riskStudents} accent="text-red-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Admission Trend</h3>
              <LineChart
                labels={data.admissionTrend.map((t) => String(t.year))}
                data={data.admissionTrend.map((t) => t.count)}
                label="Admissions"
              />
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Placement % by Department</h3>
              <BarChart
                labels={data.charts.placementByDept.map((d) => d.department)}
                data={data.charts.placementByDept.map((d) => Number(d.placed_pct ?? 0))}
                label="Placed %"
              />
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Risk Distribution</h3>
              <PieChart
                labels={["Low", "Medium", "High"]}
                data={[data.charts.riskDistribution.LOW, data.charts.riskDistribution.MEDIUM, data.charts.riskDistribution.HIGH]}
              />
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Admission → Placement Funnel</h3>
              <FunnelChart
                stages={[
                  { label: "Admitted", value: data.charts.admissionToPlacementFunnel.admitted },
                  { label: "Applied", value: data.charts.admissionToPlacementFunnel.applied },
                  { label: "Selected", value: data.charts.admissionToPlacementFunnel.selected },
                ]}
              />
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Top Recommendations</h3>
            {data.topRecommendations.length === 0 ? (
              <p className="text-sm text-slate-400">No open recommendations. Run the recommendation engine to generate.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.topRecommendations.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">{r.action_text}</span>
                    <span className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="rounded bg-slate-100 px-2 py-0.5">{r.scope_level}</span>
                      <span>P{r.priority}</span>
                      <span>×{r.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
