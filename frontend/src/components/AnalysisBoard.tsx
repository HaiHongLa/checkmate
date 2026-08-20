"use client";

import { ChessBoardPanel } from "@/components/ChessBoardPanel";
import { EvaluationBar } from "@/components/EvaluationBar";
import { MoveNavigationControls } from "@/components/MoveNavigationControls";
import type { AnalyzeResponse } from "@/lib/api";
import { Square } from "chess.js";

interface AnalysisBoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => boolean;
  orientation?: "white" | "black";
  readOnly?: boolean;
  analysis: AnalyzeResponse | null;
  analyzing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function AnalysisBoard({
  fen,
  onMove,
  orientation = "white",
  readOnly = false,
  analysis,
  analyzing,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: AnalysisBoardProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-stretch gap-2 justify-center">
        <EvaluationBar
          analysis={analysis}
          analyzing={analyzing}
          orientation={orientation}
        />
        <ChessBoardPanel
          fen={fen}
          onMove={onMove}
          orientation={orientation}
          readOnly={readOnly}
        />
      </div>
      <MoveNavigationControls
        onPrevious={onPrevious}
        onNext={onNext}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
      />
    </div>
  );
}
