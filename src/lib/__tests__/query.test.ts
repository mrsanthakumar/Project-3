import { describe, it, expect } from "vitest";
import { parseListParams } from "@/lib/query";

const reqWith = (qs: string) => new Request(`http://x/api?${qs}`);

describe("parseListParams", () => {
  it("defaults page=1, pageSize=25", () => {
    const p = parseListParams(reqWith(""));
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(25);
  });

  it("clamps pageSize to 100", () => {
    expect(parseListParams(reqWith("pageSize=500")).pageSize).toBe(100);
  });

  it("parses descending sort with - prefix", () => {
    const p = parseListParams(reqWith("sort=-created_at,name"));
    expect(p.sort).toEqual([
      { field: "created_at", dir: "DESC" },
      { field: "name", dir: "ASC" },
    ]);
  });

  it("extracts filter[...] params", () => {
    const p = parseListParams(reqWith("filter[department_id]=abc&filter[status]=ACTIVE"));
    expect(p.filters).toEqual({ department_id: "abc", status: "ACTIVE" });
  });
});
