"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/client/useApi";
import { apiGet, apiPut, ApiClientError } from "@/lib/client/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { Loading } from "@/components/ui/state";

interface Role { id: string; name: string; slug: string; isSystem: boolean; }
interface Permission { code: string; module: string; action: string; }

export default function RolesPage() {
  const roles = useApi<Role[]>("/roles");
  const permissions = useApi<Permission[]>("/permissions");
  const [selected, setSelected] = useState<Role | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setMsg(null);
    apiGet<{ permissionCodes: string[] }>(`/roles/${selected.id}/permissions`)
      .then((r) => setGranted(new Set(r.permissionCodes)))
      .finally(() => setLoading(false));
  }, [selected]);

  function toggle(code: string) {
    setGranted((s) => {
      const next = new Set(s);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setMsg(null);
    try {
      await apiPut(`/roles/${selected.id}/permissions`, { permissionCodes: [...granted] });
      setMsg("Permissions saved");
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Save failed");
    }
  }

  // Group permissions by module.
  const grouped = (permissions.data ?? []).reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Configure what each role can do (Module 1)" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Roles</h3>
          {roles.loading && <Loading />}
          <ul className="space-y-1">
            {(roles.data ?? []).map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelected(r)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selected?.id === r.id ? "bg-brand/10 font-medium text-brand" : "text-slate-600 hover:bg-slate-100"}`}>
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          {!selected ? (
            <p className="py-12 text-center text-sm text-slate-400">Select a role to edit its permissions.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{selected.name} — permissions</h3>
                <Button onClick={save}>Save</Button>
              </div>
              {msg && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}
              {loading ? <Loading /> : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Object.entries(grouped).map(([module, perms]) => (
                    <div key={module} className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{module}</p>
                      <div className="space-y-1">
                        {perms.map((p) => (
                          <label key={p.code} className="flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={granted.has(p.code)} onChange={() => toggle(p.code)} />
                            {p.action}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
