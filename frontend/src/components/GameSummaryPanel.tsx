"use client";

import {
  countClassifications,
  GameAnalysis,
  isAnalysisInProgress,
} from "@/lib/gameAnalysis";

interface GameSummaryPanelProps {
  analysis: GameAnalysis | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
  onReanalyze: () => void;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function GameSummaryPanel({
  analysis,
  loading,
  error,
  onAnalyze,
  onReanalyze,
}: GameSummaryPanelProps) {
  const generated = formatDate(analysis?.generated_at ?? null);
  const inProgress = analysis ? isAnalysisInProgress(analysis.status) : false;
  const counts = analysis ? countClassifications(analysis.moves) : {};

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Game Review
          </h3>
          {generated && analysis?.status === "COMPLETE" && (
            <p className="text-xs text-gray-500 mt-1">
              Analysis generated {generated}
            </p>
          )}
        </div>
        {analysis?.status === "COMPLETE" ? (
          <button
            type="button"
            onClick={onReanalyze}
            disabled={loading || inProgress}
            className="px-3 py-1 text-xs font-medium bg-surface-border hover:bg-gray-600 text-gray-200 rounded transition-colors disabled:opacity-50"
          >
            Re-analyze
          </button>
        ) : !inProgress ? (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent/90 text-white rounded transition-colors disabled:opacity-50"
          >
            Analyze Game
          </button>
        ) : null}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {inProgress && (
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            {analysis?.progress_message ?? "Analyzing game..."}
          </p>
          {analysis && analysis.progress_total > 0 && (
            <div className="w-full bg-surface-border rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (analysis.progress_current / analysis.progress_total) * 100,
                  )}%`,
                }}
              />
            </div>
          )}
          <p className="text-xs text-gray-500">
            {analysis?.status === "GENERATING_COACHING"
              ? "Generating coaching..."
              : "Running Stockfish..."}
          </p>
        </div>
      )}

      {analysis?.status === "FAILED" && (
        <div className="space-y-2">
          <p className="text-sm text-red-400">
            {analysis.error_message ?? "Analysis failed."}
          </p>
          <button
            type="button"
            onClick={onAnalyze}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {analysis?.status === "COMPLETE" && (
        <>
          {(analysis.white_accuracy != null || analysis.black_accuracy != null) && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase">White accuracy</p>
                <p className="text-white font-semibold">
                  {analysis.white_accuracy?.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Black accuracy</p>
                <p className="text-white font-semibold">
                  {analysis.black_accuracy?.toFixed(0)}%
                </p>
              </div>
              {analysis.white_game_rating != null && (
                <div>
                  <p className="text-gray-500 text-xs uppercase">White rating</p>
                  <p className="text-gray-300">~{analysis.white_game_rating}</p>
                </div>
              )}
              {analysis.black_game_rating != null && (
                <div>
                  <p className="text-gray-500 text-xs uppercase">Black rating</p>
                  <p className="text-gray-300">~{analysis.black_game_rating}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {counts.MISTAKE ? (
              <span className="text-orange-400">{counts.MISTAKE} mistakes</span>
            ) : null}
            {counts.BLUNDER ? (
              <span className="text-red-400">{counts.BLUNDER} blunders</span>
            ) : null}
            {counts.INACCURACY ? (
              <span className="text-yellow-400">
                {counts.INACCURACY} inaccuracies
              </span>
            ) : null}
            {counts.GREAT || counts.BRILLIANT ? (
              <span className="text-emerald-400">
                {(counts.GREAT ?? 0) + (counts.BRILLIANT ?? 0)} strong moves
              </span>
            ) : null}
          </div>

          {analysis.summary && (
            <div className="border-t border-surface-border pt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Summary
              </p>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {analysis.summary}
              </p>
            </div>
          )}
        </>
      )}

      {!analysis && !loading && !inProgress && (
        <p className="text-sm text-gray-500">
          Generate a full game review with Stockfish and AI coaching for the
          important moments.
        </p>
      )}
    </div>
  );
}
