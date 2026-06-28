import { getToken, setToken } from "@/lib/client/token";
import { getInstitution } from "@/lib/client/institution";

/** Client-side error mirroring the API error envelope. */
export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface Meta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // De-dupe concurrent refreshes.
  if (!refreshing) {
    refreshing = (async () => {
      const res = await fetch("/api/v1/auth/refresh", { method: "POST" });
      if (!res.ok) return false;
      const json = await res.json();
      setToken(json.data.accessToken);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function raw(path: string, init: RequestInit, retry = true): Promise<Response> {
  const token = getToken();
  // Super Admin requests carry the active tenant; ignored by the API for
  // institution-locked roles, so it is always safe to send.
  const institution = getInstitution();
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(institution ? { "x-institution-id": institution } : {}),
    },
  });
  if (res.status === 401 && retry && (await tryRefresh())) {
    return raw(path, init, false);
  }
  return res;
}

/** Core request: returns the `data` payload or throws ApiClientError. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await raw(path, init);
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiClientError(e?.code ?? "INTERNAL", e?.message ?? "Request failed", res.status, e?.details);
  }
  return json.data as T;
}

/** Request that also returns pagination meta. */
export async function requestList<T>(path: string): Promise<{ data: T; meta: Meta | null }> {
  const res = await raw(path, {});
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiClientError(e?.code ?? "INTERNAL", e?.message ?? "Request failed", res.status, e?.details);
  }
  return { data: json.data as T, meta: json.meta as Meta | null };
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: body !== undefined ? JSON.stringify(body) : undefined,
});

/** Multipart upload (FormData); never sets content-type so the boundary is kept. */
export async function apiUpload<T>(path: string, file: File, field = "file"): Promise<T> {
  const form = new FormData();
  form.append(field, file);
  return request<T>(path, { method: "POST", body: form });
}

/** Authenticated file download → triggers a browser save (token can't ride an <a href>). */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await raw(path, {});
  if (!res.ok) throw new ApiClientError("INTERNAL", "Download failed", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>(path, jsonInit("POST", body));
export const apiPut = <T>(path: string, body?: unknown) => request<T>(path, jsonInit("PUT", body));
export const apiPatch = <T>(path: string, body?: unknown) => request<T>(path, jsonInit("PATCH", body));
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });

/** Build a query string from a filter/sort/paging object. */
export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
