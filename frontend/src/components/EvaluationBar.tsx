"use client";

import type { AnalyzeResponse } from "@/lib/api";
import { evalToWhitePercentage, formatEvalDisplay } from "@/lib/evalBar";

interface EvaluationBarProps {
  analysis: AnalyzeResponse | null;
  analyzing: boolean;
  orientation?: "white" | "black";
}

export function EvaluationBar({
  analysis,
  analyzing,
  orientation = "white",
}: EvaluationBarProps) {
  const whitePercent = analysis
    ? evalToWhitePercentage(analysis.evaluation, analysis.mate_in)
    : 50;

  // When board is flipped, white is at the top of the bar
  const displayPercent =
    orientation === "black" ? 100 - whitePercent : whitePercent;

  const evalLabel = analysis
    ? formatEvalDisplay(analysis, "white")
    : analyzing
      ? "..."
      : "0.0";

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="relative w-7 rounded-md overflow-hidden border border-surface-border shadow-inner"
        style={{ height: "min(560px, 80vw)" }}
        aria-label="Stockfish evaluation bar"
      >
        {/* Black portion (top when white orientation) */}
        <div
          className="absolute inset-x-0 top-0 bg-[#1a1a1a] transition-[height] duration-300 ease-out"
          style={{ height: `${100 - displayPercent}%` }}
        />
        {/* White portion (bottom when white orientation) */}
        <div
          className="absolute inset-x-0 bottom-0 bg-[#eeeed2] transition-[height] duration-300 ease-out"
          style={{ height: `${displayPercent}%` }}
        />
        {/* Eval label overlay */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <span
            className={`text-[10px] font-mono font-bold px-1 py-0.5 rounded ${
              displayPercent >= 55
                ? "text-gray-800 bg-white/80"
                : "text-white bg-black/60"
            }`}
          >
            {evalLabel}
          </span>
        </div>
      </div>
      {analyzing && (
        <span className="text-[10px] text-gray-500 whitespace-nowrap">
          Analyzing...
        </span>
      )}
    </div>
  );
}
