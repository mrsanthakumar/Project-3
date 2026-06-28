/**
 * The "active institution" a Super Admin is currently viewing. Super Admin
 * accounts are global (institution_id = NULL), so every institution-scoped API
 * call must carry an X-Institution-Id header naming the tenant to act on
 * (see src/lib/auth/context.ts → resolveInstitutionScope). This module holds
 * that choice, persists it (the id is not a secret), and lets React subscribe
 * so data hooks refetch when the tenant is switched.
 */
const KEY = "active_institution_id";

let current: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;

const listeners = new Set<() => void>();

export function getInstitution(): string | null {
  return current;
}

export function setInstitution(id: string | null): void {
  if (id === current) return;
  current = id;
  if (typeof window !== "undefined") {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

/** useSyncExternalStore subscribe fn. */
export function subscribeInstitution(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
