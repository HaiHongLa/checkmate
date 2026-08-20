"use client";

import {
  classificationColor,
  classificationLabel,
  MoveAnalysis,
} from "@/lib/gameAnalysis";

interface MoveAnalysisPanelProps {
  moveAnalysis: MoveAnalysis | null;
  currentPly: number;
  isExploring?: boolean;
  onTrySuggestedMove?: (moveIndex: number, suggestedSan: string, originalSan: string) => void;
}

export function MoveAnalysisPanel({
  moveAnalysis,
  currentPly,
  isExploring = false,
  onTrySuggestedMove,
}: MoveAnalysisPanelProps) {
  if (currentPly <= 0) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Move Analysis
        </h3>
        <p className="text-sm text-gray-500">
          Select a move to see coaching for that moment.
        </p>
      </div>
    );
  }

  if (!moveAnalysis) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Move Analysis
        </h3>
        <p className="text-sm text-gray-500">
          No saved analysis for this move yet. Analyze the game to unlock coaching.
        </p>
      </div>
    );
  }

  const headline =
    moveAnalysis.coaching_headline ?? classificationLabel(moveAnalysis.classification);
  const explanation =
    moveAnalysis.coaching_explanation ??
    "Engine analysis is available for this move.";
  const showSuggestion =
    moveAnalysis.suggested_move_san &&
    moveAnalysis.classification !== "GOOD" &&
    moveAnalysis.classification !== "GREAT" &&
    moveAnalysis.classification !== "BRILLIANT";

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Move Analysis
        </h3>
        <p className="text-lg font-mono text-white mt-1">{moveAnalysis.san}</p>
      </div>

      <div>
        <span
          className={`text-xs font-bold uppercase tracking-wider ${classificationColor(moveAnalysis.classification)}`}
        >
          {classificationLabel(moveAnalysis.classification)}
        </span>
        <p className="text-sm font-medium text-white mt-1">{headline}</p>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>

      {moveAnalysis.coaching_encouragement && (
        <p className="text-sm text-emerald-300 italic">
          {moveAnalysis.coaching_encouragement}
        </p>
      )}

      {showSuggestion && (
        <div className="border-t border-surface-border pt-3 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Better was
          </p>
          <p className="font-mono text-accent font-semibold">
            {moveAnalysis.suggested_move_san}
          </p>
          {moveAnalysis.suggested_line && (
            <p className="text-xs text-gray-400 font-mono">
              {moveAnalysis.suggested_line}
            </p>
          )}
          {onTrySuggestedMove && !isExploring && (
            <button
              type="button"
              onClick={() =>
                onTrySuggestedMove(
                  moveAnalysis.move_index,
                  moveAnalysis.suggested_move_san!,
                  moveAnalysis.san,
                )
              }
              className="px-3 py-1.5 text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded-lg transition-colors"
            >
              Try {moveAnalysis.suggested_move_san}
            </button>
          )}
        </div>
      )}

      {moveAnalysis.coaching_teaching_point && (
        <div className="border-t border-surface-border pt-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Teaching point
          </p>
          <p className="text-sm text-gray-300">
            {moveAnalysis.coaching_teaching_point}
          </p>
        </div>
      )}

      {moveAnalysis.evaluation_before != null &&
        moveAnalysis.evaluation_after != null && (
          <p className="text-xs text-gray-500">
            Eval {moveAnalysis.evaluation_before.toFixed(2)} →{" "}
            {moveAnalysis.evaluation_after.toFixed(2)}
          </p>
        )}
    </div>
  );
}
