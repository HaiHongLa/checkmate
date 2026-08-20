import type { AnalyzeResponse } from "@/lib/api";

/** Convert centipawn-style eval to white's bar fill percentage (0–100). */
export function evalToWhitePercentage(
  evaluation: number,
  mateIn: number | null,
): number {
  if (mateIn !== null) {
    if (mateIn > 0) return 99;
    if (mateIn < 0) return 1;
    return 50;
  }

  // Smooth bounded mapping: 0 → 50%, ±3 → ~85/15, ±10 → ~99/1
  const deviation = Math.tanh(evaluation / 3) * 49;
  return Math.min(99, Math.max(1, 50 + deviation));
}

export function formatEvalDisplay(
  analysis: AnalyzeResponse,
  perspective: "white" | "black" = "white",
): string {
  const flip = perspective === "black";

  if (analysis.mate_in !== null) {
    const mate = flip ? -analysis.mate_in : analysis.mate_in;
    if (mate > 0) return `M${mate}`;
    if (mate < 0) return `-M${Math.abs(mate)}`;
    return "0.0";
  }

  const evaluation = flip ? -analysis.evaluation : analysis.evaluation;
  const sign = evaluation > 0 ? "+" : "";
  return `${sign}${evaluation.toFixed(1)}`;
}

export function getWhiteEvalScore(
  analysis: AnalyzeResponse,
): number {
  if (analysis.mate_in !== null) {
    return analysis.mate_in > 0 ? 10 : -10;
  }
  return analysis.evaluation;
}
