"use client";

import { AnalyzeResponse, formatEvaluation, getEvaluationValue } from "@/lib/api";

interface EnginePanelProps {
  analysis: AnalyzeResponse | null;
  analyzing: boolean;
  perspective?: "white" | "black";
}

export function EnginePanel({
  analysis,
  analyzing,
  perspective = "white",
}: EnginePanelProps) {
  const evalValue = analysis ? getEvaluationValue(analysis, perspective) : 0;

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Stockfish
        </h3>
        {analyzing && (
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border-2 border-gray-500 border-t-accent rounded-full animate-spin" />
            Analyzing...
          </span>
        )}
      </div>

      {analysis ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-baseline">
            <span className="text-gray-400">Evaluation</span>
            <span
              className={`font-mono text-lg font-semibold ${
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
            <div>
              <span className="text-gray-400 text-xs">Best move</span>
              <p className="font-mono text-white">{analysis.best_move}</p>
            </div>
          )}
          {analysis.principal_variation.length > 0 && (
            <div>
              <span className="text-gray-400 text-xs">PV</span>
              <p className="font-mono text-gray-200 text-xs leading-relaxed">
                {analysis.principal_variation.slice(0, 6).join(" ")}
              </p>
            </div>
          )}
          <div className="text-xs text-gray-500 pt-1">
            Depth {analysis.depth}
          </div>
        </div>
      ) : analyzing ? (
        <p className="text-gray-500 text-sm italic">Stockfish analyzing...</p>
      ) : (
        <p className="text-gray-500 text-sm italic">
          Waiting for position...
        </p>
      )}
    </div>
  );
}
