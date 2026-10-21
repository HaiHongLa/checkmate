"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { MoveHistory } from "@/components/MoveHistory";
import { CoachChat } from "@/components/CoachChat";
import { LearnPanel } from "@/components/opening/LearnPanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useCoach } from "@/hooks/useCoach";
import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import { useOpeningTraining } from "@/hooks/useOpeningTraining";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import {
  explanationForPly,
  fetchLine,
  generateExplanations,
  LineDetail,
  movesFromLine,
  OpeningMode,
  recordPractice,
  saveLineMoves,
  setKeyPosition,
} from "@/lib/openingLab";

interface OpeningLineWorkspaceProps {
  repertoireId: string;
  repertoireName: string;
  repertoireColor: "white" | "black";
  lineId: string;
}

export function OpeningLineWorkspace({
  repertoireId,
  repertoireName,
  repertoireColor,
  lineId,
}: OpeningLineWorkspaceProps) {
  const chessGame = useChessGame();
  const { state, loadFromMoves, makeMove, goToPly, goForward, goToPrevious } =
    chessGame;

  const [line, setLine] = useState<LineDetail | null>(null);
  const [mode, setMode] = useState<OpeningMode>("explore");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);

  const savedMoves = line ? movesFromLine(line) : [];
  const training = useOpeningTraining(savedMoves, state.currentMoveIndex);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLine(lineId);
      setLine(data);
      const moves = movesFromLine(data);
      loadFromMoves(moves);
      setIsEditing(moves.length === 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load line");
    } finally {
      setLoading(false);
    }
  }, [lineId, loadFromMoves]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isTraining = training.isTraining;
  const boardFen = isTraining
    ? training.boardState!.fen
    : state.fen;
  const boardReadOnly = !(isTraining || (mode === "explore" && isEditing));

  const liveEnabled = !isTraining && mode !== "learn";
  const { analysis, analyzing } = useLiveAnalysis(boardFen, 18, liveEnabled);

  const learnPly = isTraining ? training.learnPly : state.currentMoveIndex;
  const explanation = line ? explanationForPly(line, learnPly) : null;
  const currentPlyMeta = line?.plies.find((p) => p.ply_index === learnPly);

  const coach = useCoach(state.fen, state.moveHistory, {
    welcomeMessage:
      "Ask me about this opening position. I won't change your saved Learn content.",
    currentMove: learnPly,
  });

  const handleSaveLine = async () => {
    setSaving(true);
    try {
      const updated = await saveLineMoves(lineId, state.fullMoveHistory);
      setLine(updated);
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const updated = await generateExplanations(lineId);
      setLine(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleKey = async () => {
    if (!line || learnPly <= 0) return;
    const ply = line.plies.find((p) => p.ply_index === learnPly);
    if (!ply) return;
    await setKeyPosition(lineId, learnPly, !ply.is_key_position);
    await refresh();
  };

  const onBoardMove = useCallback(
    (from: Parameters<typeof makeMove>[0], to: Parameters<typeof makeMove>[1]) => {
      if (isTraining && training.training) {
        const plyBefore = training.training.currentPly;
        const expected = savedMoves[plyBefore];
        const played = training.trainingMakeMove(from, to);
        if (played && training.training.kind === "practice" && expected) {
          const match =
            played.replace(/[+#!?]/g, "") === expected.replace(/[+#!?]/g, "");
          setPracticeFeedback(
            match
              ? "Correct — that matches your repertoire."
              : `Your line continues with ${expected}. Your move might still be playable — check the engine.`,
          );
          void recordPractice(lineId);
        }
        return Boolean(played);
      }
      if (isEditing) {
        return makeMove(from, to);
      }
      return false;
    },
    [isTraining, isEditing, makeMove, training, savedMoves, lineId],
  );

  const navPrevious = isTraining
    ? () => {}
    : goToPrevious;
  const navNext = isTraining ? () => {} : goForward;

  useKeyboardNavigation({
    onPrevious: navPrevious,
    onNext: navNext,
    enabled: !isTraining,
  });

  if (loading || !line) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        {error ?? "Loading line…"}
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-surface-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/openings/${repertoireId}`}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ← {repertoireName}
          </Link>
          <h1 className="text-xl font-bold text-white mt-1">{line.name}</h1>
          <p className="text-xs text-gray-500">
            {repertoireColor === "white" ? "White" : "Black"} repertoire ·{" "}
            {savedMoves.length} moves
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["explore", "learn", "practice", "stress"] as OpeningMode[]).map(
            (m) => (
              <button
                key={m}
                type="button"
                disabled={isTraining && m !== mode}
                onClick={() => {
                  if (isTraining) training.endTraining();
                  setMode(m);
                  setPracticeFeedback(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                  mode === m
                    ? "bg-accent text-white"
                    : "bg-surface-card border border-surface-border text-gray-300"
                }`}
              >
                {m === "stress" ? "Stress test" : m}
              </button>
            ),
          )}
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {isTraining && (
          <div className="mb-4 bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 flex justify-between items-center">
            <p className="text-sm text-amber-100">
              Training — your saved line is not being edited
            </p>
            <button
              type="button"
              onClick={() => {
                training.endTraining();
                setPracticeFeedback(null);
              }}
              className="text-sm px-3 py-1 bg-surface-card border border-surface-border rounded-lg"
            >
              Return to line
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            {mode === "explore" && (
              <div className="flex flex-wrap gap-2">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm bg-surface-card border border-surface-border rounded-lg"
                  >
                    Edit line
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveLine()}
                      className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg"
                    >
                      {saving ? "Saving…" : "Save line"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadFromMoves(savedMoves);
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 text-sm border border-surface-border rounded-lg"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

            {mode === "learn" && (
              <button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerateAll()}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg disabled:opacity-50"
              >
                {generating
                  ? "Generating coaching…"
                  : "Generate explanations for key positions"}
              </button>
            )}

            {mode === "practice" && !isTraining && (
              <button
                type="button"
                onClick={() => {
                  training.startPractice();
                  setPracticeFeedback(null);
                }}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg"
              >
                Start practice from this position
              </button>
            )}

            {mode === "stress" && !isTraining && (
              <button
                type="button"
                onClick={() => {
                  training.startStress();
                  setPracticeFeedback(null);
                }}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg"
              >
                Stress test — play opponent deviation
              </button>
            )}

            <AnalysisBoard
              fen={boardFen}
              onMove={onBoardMove}
              orientation={repertoireColor}
              readOnly={boardReadOnly}
              analysis={liveEnabled ? analysis : null}
              analyzing={liveEnabled && analyzing}
              onPrevious={navPrevious}
              onNext={navNext}
              canGoPrevious={!isTraining && state.currentMoveIndex > 0}
              canGoNext={!isTraining && !state.isAtLatestMove}
            />

            {!isTraining && (
              <MoveHistory
                movePairs={state.movePairs}
                currentMoveIndex={state.currentMoveIndex}
                onGoToMoveIndex={goToPly}
                disabled={isEditing}
              />
            )}

            {practiceFeedback && (
              <p className="text-sm text-gray-300 bg-surface-card border border-surface-border rounded-lg p-3">
                {practiceFeedback}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {(mode === "learn" || isTraining) && (
              <LearnPanel
                plyIndex={learnPly}
                repertoireMove={
                  currentPlyMeta?.san ??
                  savedMoves[learnPly - 1] ??
                  null
                }
                explanation={explanation}
                isKey={currentPlyMeta?.is_key_position ?? false}
                onToggleKey={() => void handleToggleKey()}
                onGenerate={() => void handleGenerateAll()}
                generating={generating}
              />
            )}

            {mode === "stress" && isTraining && (
              <div className="bg-surface-card border border-surface-border rounded-lg p-4 text-sm text-gray-300">
                Play the opponent&apos;s surprise move, then your response. Use
                the coach below to talk through what changed.
              </div>
            )}

            <div className="min-h-[280px]">
              <CoachChat
                messages={coach.messages}
                loading={coach.loading}
                error={coach.error}
                onSend={coach.sendMessage}
                perspective={repertoireColor}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
