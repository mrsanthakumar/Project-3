import { describe, it, expect } from "vitest";
import { assertMetric, interpretCorrelation, interpretComparison } from "@/lib/analytics/stats";
import { ApiError } from "@/lib/http";

describe("stats: assertMetric", () => {
  it("accepts whitelisted metrics", () => {
    expect(assertMetric("current_cgpa")).toBe("current_cgpa");
  });
  it("rejects unknown metrics (prevents SQL injection)", () => {
    expect(() => assertMetric("current_cgpa; DROP TABLE students")).toThrow(ApiError);
  });
});

describe("stats: interpretation", () => {
  it("labels a strong significant positive correlation", () => {
    const text = interpretCorrelation(0.72, 0.001);
    expect(text).toContain("strong");
    expect(text).toContain("positive");
    expect(text).toContain("significant");
  });
  it("labels a non-significant comparison", () => {
    expect(interpretComparison(0.4)).toContain("No statistically significant");
  });
});
