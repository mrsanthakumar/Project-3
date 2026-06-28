"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { apiGet, ApiClientError } from "@/lib/client/api";
import { getInstitution, subscribeInstitution } from "@/lib/client/institution";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Generic GET hook with loading/error state and manual reload. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const active = useRef(true);
  // Refetch when a Super Admin switches the active institution.
  const institution = useSyncExternalStore(subscribeInstitution, getInstitution, () => null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    setError(null);
    apiGet<T>(path)
      .then((d) => active.current && setData(d))
      .catch((e) => active.current && setError(e instanceof ApiClientError ? e.message : "Failed to load"))
      .finally(() => active.current && setLoading(false));
  }, [path, nonce, institution]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
