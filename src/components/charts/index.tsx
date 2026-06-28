"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend,
);

const PALETTE = ["#1e40af", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899"];
const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

export function BarChart({ labels, data, label }: { labels: string[]; data: number[]; label?: string }) {
  return (
    <div className="h-64">
      <Bar
        options={baseOptions}
        data={{ labels, datasets: [{ label: label ?? "", data, backgroundColor: "#1e40af", borderRadius: 4 }] }}
      />
    </div>
  );
}

export function LineChart({ labels, data, label }: { labels: string[]; data: number[]; label?: string }) {
  return (
    <div className="h-64">
      <Line
        options={baseOptions}
        data={{
          labels,
          datasets: [{ label: label ?? "", data, borderColor: "#1e40af", backgroundColor: "rgba(30,64,175,0.1)", tension: 0.3, fill: true }],
        }}
      />
    </div>
  );
}

export function PieChart({ labels, data }: { labels: string[]; data: number[] }) {
  return (
    <div className="h-64">
      <Pie
        options={{ ...baseOptions, plugins: { legend: { display: true, position: "bottom" } } }}
        data={{ labels, datasets: [{ data, backgroundColor: PALETTE }] }}
      />
    </div>
  );
}

/** Lightweight funnel: descending labelled bars (Chart.js has no native funnel). */
export function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{s.label}</span>
            <span className="font-medium text-slate-700">{s.value}</span>
          </div>
          <div className="h-6 rounded bg-slate-100">
            <div
              className="flex h-6 items-center rounded text-xs font-medium text-white"
              style={{ width: `${Math.max(6, (s.value / max) * 100)}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
