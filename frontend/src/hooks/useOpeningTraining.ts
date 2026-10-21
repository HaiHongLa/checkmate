"use client";

import { Square } from "chess.js";
import { useCallback, useMemo, useState } from "react";
import { buildGameAtPly } from "@/hooks/useChessGame";
import { buildExplorationBoardState } from "@/lib/explorationState";

export type TrainingKind = "practice" | "stress" | null;

export interface TrainingState {
  kind: TrainingKind;
  moves: string[];
  currentPly: number;
  /** Saved line ply where training started */
  startPly: number;
  /** For stress: ply where opponent deviated */
  branchPly: number | null;
  learnPly: number;
}

export function useOpeningTraining(savedMoves: string[], currentPly: number) {
  const [training, setTraining] = useState<TrainingState | null>(null);

  const isTraining = training !== null;

  const startPractice = useCallback(() => {
    const learnPly = currentPly === 0 ? 1 : currentPly;
    setTraining({
      kind: "practice",
      moves: savedMoves.slice(0, currentPly),
      currentPly,
      startPly: currentPly,
      branchPly: null,
      learnPly,
    });
  }, [savedMoves, currentPly]);

  const startStress = useCallback(() => {
    const learnPly = currentPly === 0 ? 1 : currentPly;
    setTraining({
      kind: "stress",
      moves: savedMoves.slice(0, currentPly),
      currentPly,
      startPly: currentPly,
      branchPly: currentPly,
      learnPly,
    });
  }, [savedMoves, currentPly]);

  const endTraining = useCallback(() => {
    setTraining(null);
  }, []);

  const trainingMakeMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
      if (!training) return false;
      const copy = buildGameAtPly(training.moves, training.currentPly);
      try {
        const result = copy.move({ from, to, promotion: promotion ?? "q" });
        if (!result) return false;
        const truncated = training.moves.slice(0, training.currentPly);
        const newMoves = [...truncated, result.san];
        setTraining({
          ...training,
          moves: newMoves,
          currentPly: newMoves.length,
        });
        return result.san;
      } catch {
        return false;
      }
    },
    [training],
  );

  const boardState = useMemo(() => {
    if (!training) return null;
    return buildExplorationBoardState(training.moves, training.currentPly);
  }, [training]);

  const expectedMoveSan = useMemo(() => {
    if (!training || training.kind !== "practice") return null;
    const nextIndex = training.currentPly;
    if (nextIndex >= savedMoves.length) return null;
    return savedMoves[nextIndex];
  }, [training, savedMoves]);

  return {
    training,
    isTraining,
    boardState,
    expectedMoveSan,
    learnPly: training?.learnPly ?? currentPly,
    startPractice,
    startStress,
    endTraining,
    trainingMakeMove,
  };
}
