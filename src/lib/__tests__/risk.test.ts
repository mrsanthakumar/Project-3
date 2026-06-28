import { describe, it, expect } from "vitest";
import { triggered, bandFor } from "@/lib/risk/engine";

describe("risk: triggered", () => {
  it("LT triggers when value below threshold", () => {
    expect(triggered(5.4, "LT", 6)).toBe(true);
    expect(triggered(6.1, "LT", 6)).toBe(false);
  });
  it("GT triggers when value above threshold", () => {
    expect(triggered(4, "GT", 3)).toBe(true);
    expect(triggered(3, "GT", 3)).toBe(false);
  });
  it("never triggers on null value", () => {
    expect(triggered(null, "LT", 6)).toBe(false);
  });
});

describe("risk: bandFor", () => {
  const bands = [
    { level: "LOW" as const, min_score: "0", max_score: "33" },
    { level: "MEDIUM" as const, min_score: "34", max_score: "66" },
    { level: "HIGH" as const, min_score: "67", max_score: "100" },
  ];
  it("maps scores into the right band", () => {
    expect(bandFor(0, bands)).toBe("LOW");
    expect(bandFor(40, bands)).toBe("MEDIUM");
    expect(bandFor(75, bands)).toBe("HIGH");
  });
});
