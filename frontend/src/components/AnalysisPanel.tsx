"use client";

import { AnalyzeResponse, formatEvaluation, getEvaluationValue } from "@/lib/api";

interface AnalysisPanelProps {
  analysis: AnalyzeResponse | null;
  analyzing: boolean;
  onAnalyze: () => void;
  perspective?: "white" | "black";
}

export function AnalysisPanel({
  analysis,
  analyzing,
  onAnalyze,
  perspective = "white",
}: AnalysisPanelProps) {
  const evalValue = analysis ? getEvaluationValue(analysis, perspective) : 0;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Engine Analysis
        </h3>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="px-3 py-1 text-xs font-medium bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
        >
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">
              Evaluation {perspective === "black" ? "(Black)" : "(White)"}
            </span>
            <span
              className={`font-mono font-semibold ${
                evalValue > 0
                  ? "text-green-400"
                  : evalValue < 0
                    ? "text-red-400"
                    : "text-gray-300"
              }`}
            >
              {formatEvaluation(analysis, perspective)}
            </span>
          </div>
          {analysis.best_move && (
            <div className="flex justify-between">
              <span className="text-gray-400">Best move</span>
              <span className="font-mono text-white">{analysis.best_move}</span>
            </div>
          )}
          {analysis.principal_variation.length > 0 && (
            <div>
              <span className="text-gray-400 block mb-1">Principal variation</span>
              <span className="font-mono text-gray-200 text-xs leading-relaxed">
                {analysis.principal_variation.join(" ")}
              </span>
            </div>
          )}
          <div className="text-xs text-gray-500 pt-1">
            Depth {analysis.depth}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">
          Click Analyze to evaluate the current position with Stockfish.
        </p>
      )}
    </div>
  );
}
