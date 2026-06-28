"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { apiGet } from "@/lib/client/api";
import {
  getInstitution,
  setInstitution,
  subscribeInstitution,
} from "@/lib/client/institution";

interface Institution {
  id: string;
  code: string;
  name: string;
}

/**
 * Tenant picker for Super Admin. Super Admin accounts are global, so the API
 * needs an explicit institution per request (X-Institution-Id). This selects
 * it; every data hook refetches on change. Renders nothing for other roles.
 */
export function InstitutionSwitcher() {
  const active = useSyncExternalStore(subscribeInstitution, getInstitution, () => null);
  const [list, setList] = useState<Institution[]>([]);

  useEffect(() => {
    apiGet<Institution[]>("/institutions?pageSize=200&sort=name")
      .then((rows) => {
        setList(rows);
        // Default to the first tenant so scoped pages work immediately.
        if (!getInstitution() && rows[0]) setInstitution(rows[0].id);
      })
      .catch(() => setList([]));
  }, []);

  if (list.length === 0) return null;

  return (
    <select
      value={active ?? ""}
      onChange={(e) => setInstitution(e.target.value || null)}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none"
      title="Active institution"
    >
      {!active && <option value="">Select institution…</option>}
      {list.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name} ({i.code})
        </option>
      ))}
    </select>
  );
}
