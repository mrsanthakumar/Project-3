"use client";

import { useState } from "react";
import { useApi } from "@/lib/client/useApi";
import { apiPost, apiPatch, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader, Input, Field } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";

const COMPARATORS = ["GTE", "LTE", "GT", "LT", "EQ", "NEQ"];
const STATUS = ["OPEN", "IN_PROGRESS", "DONE", "DISMISSED"];

interface Recommendation { id: string; action_text: string; scope_level: string; priority: number; status: string; student_name?: string; department_code?: string; }
interface Rule { id: string; name: string; scopeLevel: string; actionText: string; logic: string; priority: number; }
interface Condition { metric: string; comparator: string; value: string; }

export default function RecommendationsPage() {
  const recs = useApi<Recommendation[]>("/recommendations");
  const rules = useApi<Rule[]>("/recommendation-rules");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showRule, setShowRule] = useState(false);

  async function generate() {
    setBusy(true); setMsg(null);
    try {
      const s = await apiPost<{ generated: number }>("/recommendations/generate");
      setMsg(`Generated ${s.generated} recommendations`);
      recs.reload();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await apiPatch(`/recommendations/${id}`, { status });
    recs.reload();
  }

  return (
    <div>
      <PageHeader title="Recommendations" subtitle="Rule-based, configurable recommendations"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowRule(true)}>+ Rule</Button>
            <Button onClick={generate} loading={busy}>Generate</Button>
          </div>
        } />

      {msg && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Generated Recommendations</h3>
          <ul className="divide-y divide-slate-100">
            {(recs.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="text-slate-700">{r.action_text}</p>
                  <p className="text-xs text-slate-400">{r.scope_level}{r.student_name ? ` · ${r.student_name}` : r.department_code ? ` · ${r.department_code}` : ""} · P{r.priority}</p>
                </div>
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                  {STATUS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </li>
            ))}
            {recs.data?.length === 0 && <li className="py-4 text-sm text-slate-400">None yet — click Generate.</li>}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Active Rules</h3>
          <ul className="space-y-2 text-sm">
            {(rules.data ?? []).map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="font-medium text-slate-700">{r.name}</p>
                <p className="text-xs text-slate-400">{r.scopeLevel} · {r.logic} · “{r.actionText}”</p>
              </li>
            ))}
            {rules.data?.length === 0 && <li className="text-slate-400">No rules yet.</li>}
          </ul>
        </Card>
      </div>

      <RuleModal open={showRule} onClose={() => setShowRule(false)} onSaved={() => { setShowRule(false); rules.reload(); }} />
    </div>
  );
}

function RuleModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [scopeLevel, setScopeLevel] = useState("STUDENT");
  const [logic, setLogic] = useState("ALL");
  const [actionText, setActionText] = useState("");
  const [priority, setPriority] = useState("3");
  const [conditions, setConditions] = useState<Condition[]>([{ metric: "avg_attendance_pct", comparator: "LT", value: "75" }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setCond(i: number, key: keyof Condition, v: string) {
    setConditions((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      await apiPost("/recommendation-rules", {
        name, scopeLevel, logic, actionText, priority: Number(priority),
        conditions: conditions.map((c) => ({ metric: c.metric, comparator: c.comparator, value: Number(c.value) })),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Recommendation Rule">
      <div className="space-y-3">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Scope">
            <select value={scopeLevel} onChange={(e) => setScopeLevel(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {["STUDENT", "DEPARTMENT", "INSTITUTION"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Logic">
            <select value={logic} onChange={(e) => setLogic(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option>ALL</option><option>ANY</option>
            </select>
          </Field>
          <Field label="Priority"><Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} /></Field>
        </div>
        <Field label="Action Text"><Input value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Conduct Counseling" /></Field>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Conditions</p>
          {conditions.map((c, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input placeholder="metric" value={c.metric} onChange={(e) => setCond(i, "metric", e.target.value)} />
              <select value={c.comparator} onChange={(e) => setCond(i, "comparator", e.target.value)} className="rounded-lg border border-slate-300 px-2 text-sm">
                {COMPARATORS.map((cmp) => <option key={cmp}>{cmp}</option>)}
              </select>
              <Input type="number" placeholder="value" value={c.value} onChange={(e) => setCond(i, "value", e.target.value)} />
            </div>
          ))}
          <button onClick={() => setConditions((cs) => [...cs, { metric: "", comparator: "LT", value: "" }])}
            className="text-sm text-brand hover:underline">+ Add condition</button>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end"><Button onClick={save} loading={busy}>Save Rule</Button></div>
      </div>
    </Modal>
  );
}
