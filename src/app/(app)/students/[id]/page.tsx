"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/client/useApi";
import { apiPut, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader, Input, Field } from "@/components/ui";
import { Loading, ErrorState } from "@/components/ui/state";
import { LineChart } from "@/components/charts";

interface Journey {
  student: { registerNumber: string; name: string };
  admission: { admission_year: number; admission_type: string; cutoff_mark: number; school_name: string; district: string } | null;
  academics: { gpaTrend: { semester: number; gpa: number; cgpa: number }[]; currentCgpa: number | null; avgAttendance: number | null };
  placement: { isPlaced: boolean; highestPackageLpa: number | null; offers: { company: string; status: string; package_lpa: number | null }[] };
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const journey = useApi<Journey>(`/analytics/student-journey/${id}`);
  const [extra, setExtra] = useState({ internshipCount: "", certificationCount: "", hackathonCount: "", codingScore: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function saveExtra() {
    setMsg(null);
    try {
      const payload: Record<string, number> = {};
      for (const [k, v] of Object.entries(extra)) if (v !== "") payload[k] = Number(v);
      await apiPut(`/students/${id}/extra`, payload);
      setMsg("Employability profile saved");
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Save failed");
    }
  }

  if (journey.loading) return <Loading />;
  if (journey.error) return <ErrorState message={journey.error} onRetry={journey.reload} />;
  const d = journey.data!;

  return (
    <div>
      <PageHeader title={d.student.name} subtitle={`${d.student.registerNumber} · Student Journey`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Admission</h3>
          {d.admission ? (
            <dl className="space-y-1 text-sm text-slate-600">
              <div className="flex justify-between"><dt>Year</dt><dd>{d.admission.admission_year}</dd></div>
              <div className="flex justify-between"><dt>Type</dt><dd>{d.admission.admission_type}</dd></div>
              <div className="flex justify-between"><dt>Cutoff</dt><dd>{d.admission.cutoff_mark ?? "—"}</dd></div>
              <div className="flex justify-between"><dt>School</dt><dd>{d.admission.school_name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt>District</dt><dd>{d.admission.district ?? "—"}</dd></div>
            </dl>
          ) : <p className="text-sm text-slate-400">No admission record.</p>}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Academics</h3>
          <div className="mb-3 flex gap-6 text-sm">
            <span>CGPA: <b>{d.academics.currentCgpa ?? "—"}</b></span>
            <span>Attendance: <b>{d.academics.avgAttendance ?? "—"}%</b></span>
          </div>
          {d.academics.gpaTrend.length > 0 ? (
            <LineChart labels={d.academics.gpaTrend.map((g) => `S${g.semester}`)} data={d.academics.gpaTrend.map((g) => g.cgpa)} label="CGPA" />
          ) : <p className="text-sm text-slate-400">No semester GPA yet.</p>}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Placement</h3>
          <p className="mb-2 text-sm">Status: <b>{d.placement.isPlaced ? "Placed" : "Not placed"}</b>{d.placement.highestPackageLpa ? ` · ${d.placement.highestPackageLpa} LPA` : ""}</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {d.placement.offers.map((o, i) => (
              <li key={i} className="flex justify-between"><span>{o.company}</span><span>{o.status}{o.package_lpa ? ` · ${o.package_lpa} LPA` : ""}</span></li>
            ))}
            {d.placement.offers.length === 0 && <li className="text-slate-400">No applications.</li>}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Employability (editable)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Internships"><Input type="number" value={extra.internshipCount} onChange={(e) => setExtra((s) => ({ ...s, internshipCount: e.target.value }))} /></Field>
            <Field label="Certifications"><Input type="number" value={extra.certificationCount} onChange={(e) => setExtra((s) => ({ ...s, certificationCount: e.target.value }))} /></Field>
            <Field label="Hackathons"><Input type="number" value={extra.hackathonCount} onChange={(e) => setExtra((s) => ({ ...s, hackathonCount: e.target.value }))} /></Field>
            <Field label="Coding Score"><Input type="number" value={extra.codingScore} onChange={(e) => setExtra((s) => ({ ...s, codingScore: e.target.value }))} /></Field>
          </div>
          {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}
          <Button className="mt-3" onClick={saveExtra}>Save</Button>
        </Card>
      </div>
    </div>
  );
}
