import { describe, it, expect } from "vitest";
import { formatEvaluation, getEvaluationValue } from "@/lib/api";

describe("evaluation formatting", () => {
  const analysis = {
    evaluation: 0.82,
    best_move: "Nf3",
    principal_variation: ["Nf3"],
    depth: 15,
    mate_in: null as number | null,
  };

  it("shows white perspective by default", () => {
    expect(formatEvaluation(analysis, "white")).toBe("+0.82");
    expect(getEvaluationValue(analysis, "white")).toBe(0.82);
  });

  it("flips evaluation for black perspective", () => {
    expect(formatEvaluation(analysis, "black")).toBe("-0.82");
    expect(getEvaluationValue(analysis, "black")).toBe(-0.82);
  });

  it("flips mate scores for black perspective", () => {
    const mateAnalysis = { ...analysis, evaluation: 100, mate_in: 3 };
    expect(formatEvaluation(mateAnalysis, "black")).toBe("-M3");
  });
});
