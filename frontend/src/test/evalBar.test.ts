import { describe, it, expect } from "vitest";
import { evalToWhitePercentage, formatEvalDisplay } from "@/lib/evalBar";

describe("evalToWhitePercentage", () => {
  it("returns 50 for equal position", () => {
    expect(evalToWhitePercentage(0, null)).toBeCloseTo(50, 0);
  });

  it("returns higher white percentage for white advantage", () => {
    expect(evalToWhitePercentage(1, null)).toBeGreaterThan(60);
    expect(evalToWhitePercentage(2, null)).toBeGreaterThan(70);
  });

  it("returns lower white percentage for black advantage", () => {
    expect(evalToWhitePercentage(-1, null)).toBeLessThan(40);
    expect(evalToWhitePercentage(-2, null)).toBeLessThan(30);
  });

  it("caps large advantages without going linear to infinity", () => {
    expect(evalToWhitePercentage(10, null)).toBeLessThan(100);
    expect(evalToWhitePercentage(10, null)).toBeGreaterThan(95);
    expect(evalToWhitePercentage(-10, null)).toBeGreaterThan(0);
    expect(evalToWhitePercentage(-10, null)).toBeLessThan(5);
  });

  it("handles mate scores", () => {
    expect(evalToWhitePercentage(0, 3)).toBe(99);
    expect(evalToWhitePercentage(0, -3)).toBe(1);
  });
});

describe("formatEvalDisplay", () => {
  const base = {
    evaluation: 1.2,
    best_move: "Nf3",
    principal_variation: [],
    depth: 18,
    mate_in: null as number | null,
  };

  it("formats positive eval", () => {
    expect(formatEvalDisplay(base)).toBe("+1.2");
  });

  it("formats mate for white", () => {
    expect(formatEvalDisplay({ ...base, mate_in: 3, evaluation: 100 })).toBe("M3");
  });

  it("formats mate for black from black perspective", () => {
    expect(
      formatEvalDisplay({ ...base, mate_in: 3, evaluation: 100 }, "black"),
    ).toBe("-M3");
  });
});
