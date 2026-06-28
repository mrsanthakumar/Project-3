/** Parse standard list query params (see docs/API_DESIGN.md §1.6). */
export interface ListParams {
  page: number;
  pageSize: number;
  sort: { field: string; dir: "ASC" | "DESC" }[];
  search: string | null;
  filters: Record<string, string>;
}

export function parseListParams(req: Request): ListParams {
  const url = new URL(req.url);
  const q = url.searchParams;

  const page = Math.max(1, Number(q.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize") ?? 25) || 25));

  const sort = (q.get("sort") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) =>
      s.startsWith("-")
        ? { field: s.slice(1), dir: "DESC" as const }
        : { field: s, dir: "ASC" as const },
    );

  const filters: Record<string, string> = {};
  for (const [key, value] of q.entries()) {
    const m = key.match(/^filter\[(.+)\]$/);
    if (m) filters[m[1]] = value;
  }

  return {
    page,
    pageSize,
    sort,
    search: q.get("search"),
    filters,
  };
}
