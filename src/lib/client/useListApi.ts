"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { requestList, ApiClientError } from "@/lib/client/api";
import { getInstitution, subscribeInstitution } from "@/lib/client/institution";

interface Meta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Paginated list GET hook returning rows + meta. */
export function useListApi<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const active = useRef(true);
  // Refetch when a Super Admin switches the active institution.
  const institution = useSyncExternalStore(subscribeInstitution, getInstitution, () => null);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    requestList<T[]>(path)
      .then((r) => {
        if (!active.current) return;
        setData(Array.isArray(r.data) ? r.data : []);
        setMeta(r.meta);
      })
      .catch((e) => active.current && setError(e instanceof ApiClientError ? e.message : "Failed to load"))
      .finally(() => active.current && setLoading(false));
  }, [path, nonce, institution]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, meta, loading, error, reload };
}
