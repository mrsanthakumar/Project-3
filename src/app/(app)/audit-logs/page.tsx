"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, qs, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { Loading, ErrorState } from "@/components/ui/state";

interface Log { id: string; action: string; entity: string | null; entity_id: string | null; ip_address: string | null; created_at: string; }
interface Page { logs: Log[]; nextCursor: string | null; }

const ACTIONS = ["", "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "UPLOAD", "DOWNLOAD", "EXPORT"];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (after?: string | null, reset = false) => {
    setLoading(true); setError(null);
    try {
      const path = `/audit-logs${qs({ action: action || undefined, after: after ?? undefined, limit: 50 })}`;
      const page = await apiGet<Page>(path);
      setLogs((prev) => (reset ? page.logs : [...prev, ...page.logs]));
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { load(null, true); }, [load]);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Login, changes, uploads, downloads" />
      <div className="mb-4">
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {ACTIONS.map((a) => <option key={a} value={a}>{a || "All actions"}</option>)}
        </select>
      </div>

      <Card>
        {error && <ErrorState message={error} onRetry={() => load(null, true)} />}
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="py-2">Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>IP</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                <td><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{l.action}</span></td>
                <td className="text-slate-700">{l.entity ?? "—"}</td>
                <td className="text-xs text-slate-400">{l.entity_id ?? "—"}</td>
                <td className="text-xs text-slate-400">{l.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <Loading />}
        {cursor && !loading && (
          <div className="mt-4 text-center">
            <Button variant="secondary" onClick={() => load(cursor)}>Load more</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
