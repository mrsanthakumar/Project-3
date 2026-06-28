"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/client/useApi";
import { apiGet, apiPost, apiDelete, ApiClientError } from "@/lib/client/api";
import { OptionSelect } from "@/components/data/OptionSelect";
import { Button, Card, PageHeader, Input } from "@/components/ui";
import { Loading, ErrorState } from "@/components/ui/state";

const COMPARATORS = ["GTE", "LTE", "GT", "LT", "EQ", "NEQ"];

interface Criterion { id: string; code: string; label: string; comparator: string; value_numeric: number | null; value_text: string | null; }
interface Eligible {
  driveId: string; eligible: number;
  students: { studentId: string; registerNumber: string; name: string; isEligible: boolean; failedCriteria: { code: string; required: string; actual: unknown }[] }[];
}

export default function DriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const criteria = useApi<Criterion[]>(`/recruitment-drives/${id}/criteria`);
  const [eligible, setEligible] = useState<Eligible | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // New-rule form state
  const [criteriaCode, setCriteriaCode] = useState("");
  const [comparator, setComparator] = useState("GTE");
  const [value, setValue] = useState("");

  async function addRule() {
    setMsg(null);
    try {
      const v: number | string = isNaN(Number(value)) ? value : Number(value);
      await apiPost(`/recruitment-drives/${id}/criteria`, { criteria: [{ criteriaCode, comparator, value: v }] });
      setCriteriaCode(""); setValue("");
      criteria.reload();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Failed to add rule");
    }
  }

  async function removeRule(cid: string) {
    await apiDelete(`/recruitment-drives/${id}/criteria/${cid}`);
    criteria.reload();
  }

  async function recompute() {
    setBusy(true); setMsg(null);
    try {
      const summary = await apiPost<{ evaluated: number; eligible: number }>(`/recruitment-drives/${id}/recompute`);
      setMsg(`Evaluated ${summary.evaluated} students — ${summary.eligible} eligible`);
      const list = await apiGet<Eligible>(`/recruitment-drives/${id}/eligible-students?filter[eligible]=true`);
      setEligible(list);
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Recompute failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Recruitment Drive" subtitle="Dynamic eligibility — no rules are hardcoded"
        actions={<Button onClick={recompute} loading={busy}>Recompute Eligibility</Button>} />

      {msg && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Eligibility Criteria</h3>
          {criteria.loading && <Loading />}
          {criteria.error && <ErrorState message={criteria.error} onRetry={criteria.reload} />}
          {criteria.data && (
            <ul className="mb-4 space-y-2">
              {criteria.data.length === 0 && <li className="text-sm text-slate-400">No criteria yet — drive admits everyone.</li>}
              {criteria.data.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span>{c.label} <b>{c.comparator}</b> {c.value_numeric ?? c.value_text}</span>
                  <button onClick={() => removeRule(c.id)} className="text-red-600 hover:underline">Remove</button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium uppercase text-slate-400">Add rule</p>
            <OptionSelect optionsFrom={{ path: "/criteria-master", valueKey: "code", labelKey: "label" }}
              value={criteriaCode} onChange={setCriteriaCode} />
            <div className="flex gap-2">
              <select value={comparator} onChange={(e) => setComparator(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {COMPARATORS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <Input placeholder="Value (e.g. 8 or CSE id)" value={value} onChange={(e) => setValue(e.target.value)} />
              <Button variant="secondary" onClick={addRule} disabled={!criteriaCode || !value}>Add</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Eligible Students {eligible && <span className="text-slate-400">({eligible.eligible})</span>}
          </h3>
          {!eligible ? (
            <p className="text-sm text-slate-400">Run “Recompute Eligibility” to evaluate students against the criteria.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr><th className="py-1">Reg No</th><th className="py-1">Name</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligible.students.map((s) => (
                    <tr key={s.studentId}><td className="py-1.5">{s.registerNumber}</td><td className="py-1.5">{s.name}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
