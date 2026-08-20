"use client";

import { useCallback, useState } from "react";
import { MoveHistory } from "@/components/MoveHistory";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { EnginePanel } from "@/components/EnginePanel";
import { CoachChat } from "@/components/CoachChat";
import { GameSummaryPanel } from "@/components/GameSummaryPanel";
import { MoveAnalysisPanel } from "@/components/MoveAnalysisPanel";
import { ExplorationMoveHistory } from "@/components/ExplorationMoveHistory";
import { useChessGame } from "@/hooks/useChessGame";
import { useCoach } from "@/hooks/useCoach";
import { useLiveAnalysis } from "@/hooks/useLiveAnalysis";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useExploration } from "@/hooks/useExploration";
import {
  GameAnalysis,
  getMoveAnalysisForPly,
} from "@/lib/gameAnalysis";

export interface GameInfoBanner {
  title: string;
  subtitle?: string;
  meta?: string[];
}

interface ChessWorkspaceProps {
  headerAction?: React.ReactNode;
  gameInfo?: GameInfoBanner | null;
  readOnly?: boolean;
  coachPgn?: string;
  coachWelcomeMessage?: string;
  defaultOrientation?: "white" | "black";
  showNewGame?: boolean;
  onNewGame?: () => void;
  chessGame?: ReturnType<typeof useChessGame>;
  gameAnalysis?: GameAnalysis | null;
  gameAnalysisLoading?: boolean;
  gameAnalysisError?: string | null;
  onAnalyzeGame?: () => void;
  onReanalyzeGame?: () => void;
  enableExploration?: boolean;
}

export function ChessWorkspace({
  headerAction,
  gameInfo,
  readOnly = false,
  coachPgn,
  coachWelcomeMessage,
  defaultOrientation = "white",
  showNewGame = true,
  onNewGame,
  chessGame: externalGame,
  gameAnalysis = null,
  gameAnalysisLoading = false,
  gameAnalysisError = null,
  onAnalyzeGame,
  onReanalyzeGame,
  enableExploration = false,
}: ChessWorkspaceProps) {
  const internalGame = useChessGame();
  const chessGame = externalGame ?? internalGame;
  const exploration = useExploration(chessGame);

  // Original game state — never replaced by exploration moves
  const originalState = chessGame.state;

  // Board position: exploration line when active, otherwise original game
  const boardFen = exploration.isExploring
    ? exploration.boardState!.fen
    : originalState.fen;
  const boardTurn = exploration.isExploring
    ? exploration.boardState!.turn
    : originalState.turn;
  const boardIsGameOver = exploration.isExploring
    ? exploration.boardState!.isGameOver
    : originalState.isGameOver;
  const boardGameResult = exploration.isExploring
    ? exploration.boardState!.gameResult
    : originalState.gameResult;
  const boardMoveCount = exploration.isExploring
    ? exploration.boardState!.fullMoveHistory.length
    : originalState.fullMoveHistory.length;
  const boardCurrentPly = exploration.isExploring
    ? exploration.boardState!.currentPly
    : originalState.currentMoveIndex;
  const boardIsAtLatest = exploration.isExploring
    ? exploration.boardState!.isAtLatestMove
    : originalState.isAtLatestMove;
  const boardMoveHistory = exploration.isExploring
    ? exploration.boardState!.moveHistory
    : originalState.moveHistory;

  // Coaching panel follows the original selected move, frozen during exploration
  const analysisMoveIndex = enableExploration
    ? exploration.analysisMoveIndex
    : originalState.currentMoveIndex;

  const originalHighlightIndex = exploration.isExploring
    ? exploration.exploration!.startMoveIndex
    : originalState.currentMoveIndex;

  const makeMove = enableExploration ? exploration.makeMove : chessGame.makeMove;
  const goToPrevious = enableExploration
    ? exploration.goToPrevious
    : chessGame.goToPrevious;
  const goForward = enableExploration
    ? exploration.goForward
    : chessGame.goForward;
  const goToPly = enableExploration
    ? exploration.goToPly
    : chessGame.goToPly;

  const liveAnalysisEnabled = !exploration.isExploring;
  const { analysis, analyzing, clearCache } = useLiveAnalysis(
    boardFen,
    18,
    liveAnalysisEnabled,
  );

  const currentMoveAnalysis = getMoveAnalysisForPly(
    gameAnalysis,
    analysisMoveIndex,
  );

  const coach = useCoach(boardFen, boardMoveHistory, {
    pgn: coachPgn,
    currentMove: analysisMoveIndex,
    welcomeMessage: coachWelcomeMessage,
    savedMoveAnalysis: currentMoveAnalysis
      ? {
          san: currentMoveAnalysis.san,
          classification: currentMoveAnalysis.classification,
          coaching_headline: currentMoveAnalysis.coaching_headline,
          coaching_explanation: currentMoveAnalysis.coaching_explanation,
          coaching_teaching_point: currentMoveAnalysis.coaching_teaching_point,
          suggested_move_san: currentMoveAnalysis.suggested_move_san,
          centipawn_loss: currentMoveAnalysis.centipawn_loss,
        }
      : null,
    gameSummary: gameAnalysis?.summary,
  });

  const [orientation, setOrientation] = useState<"white" | "black">(
    defaultOrientation,
  );

  const canGoPrevious = boardCurrentPly > 0;
  const canGoNext = !boardIsAtLatest;

  useKeyboardNavigation({
    onPrevious: goToPrevious,
    onNext: goForward,
    enabled: true,
  });

  function flipBoard() {
    setOrientation((prev) => (prev === "white" ? "black" : "white"));
  }

  const handleNewGame = useCallback(() => {
    if (onNewGame) {
      onNewGame();
    } else {
      chessGame.resetGame();
    }
    clearCache();
  }, [onNewGame, chessGame, clearCache]);

  const handleTrySuggestedMove = useCallback(
    (moveIndex: number, suggestedSan: string, originalSan: string) => {
      if (!enableExploration || exploration.isExploring) return;
      exploration.startExploration(moveIndex, suggestedSan, originalSan);
    },
    [enableExploration, exploration],
  );

  const moveClassifications = gameAnalysis
    ? Object.fromEntries(
        gameAnalysis.moves.map((m) => [m.move_index, m.classification]),
      )
    : undefined;

  return (
    <>
      <header className="border-b border-surface-border px-6 py-4 flex items-center justify-between">
        <div>
          {gameInfo ? (
            <>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {gameInfo.title}
              </h1>
              {gameInfo.subtitle && (
                <p className="text-xs text-gray-400">{gameInfo.subtitle}</p>
              )}
              {gameInfo.meta && gameInfo.meta.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {gameInfo.meta.join(" · ")}
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Play
              </h1>
              <p className="text-xs text-gray-400">Interactive chessboard</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {showNewGame && (
            <button
              onClick={handleNewGame}
              className="px-4 py-2 bg-surface-card hover:bg-surface-border border border-surface-border text-white text-sm font-medium rounded-lg transition-colors"
            >
              New Game
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 h-[calc(100vh-88px)]">
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
            {onAnalyzeGame && (
              <GameSummaryPanel
                analysis={gameAnalysis}
                loading={gameAnalysisLoading}
                error={gameAnalysisError}
                onAnalyze={onAnalyzeGame}
                onReanalyze={onReanalyzeGame ?? onAnalyzeGame}
              />
            )}

            {exploration.isExploring && exploration.exploration && (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                    Exploring alternative line
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    Reviewing: {exploration.exploration.originalSan} · Playing:{" "}
                    {exploration.exploration.alternativeSan}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exploration.returnToGame}
                  className="px-3 py-1.5 text-sm font-medium bg-surface-card hover:bg-surface-border border border-surface-border text-white rounded-lg"
                >
                  ↩ Return to Game
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    boardTurn === "white"
                      ? "bg-white"
                      : "bg-gray-800 border border-gray-600"
                  }`}
                />
                <span className="text-sm text-gray-300">
                  {boardIsGameOver
                    ? boardGameResult
                    : `${boardTurn === "white" ? "White" : "Black"} to move`}
                  {boardMoveCount > 0 && (
                    <span className="text-gray-500 ml-2">
                      · move {boardCurrentPly} / {boardMoveCount}
                      {exploration.isExploring && (
                        <span className="text-amber-500 ml-1">· exploring</span>
                      )}
                    </span>
                  )}
                  {!boardIsAtLatest && (
                    <span className="text-gray-500 ml-2">· viewing</span>
                  )}
                </span>
              </div>
              <button
                onClick={flipBoard}
                className="px-3 py-1 text-xs font-medium bg-surface-card hover:bg-surface-border border border-surface-border text-gray-300 rounded transition-colors"
              >
                Flip Board
              </button>
            </div>

            <AnalysisBoard
              fen={boardFen}
              onMove={makeMove}
              orientation={orientation}
              readOnly={readOnly && !exploration.isExploring}
              analysis={liveAnalysisEnabled ? analysis : null}
              analyzing={liveAnalysisEnabled && analyzing}
              onPrevious={goToPrevious}
              onNext={goForward}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <MoveHistory
                  movePairs={originalState.movePairs}
                  currentMoveIndex={originalHighlightIndex}
                  onGoToMoveIndex={
                    exploration.isExploring ? () => {} : goToPly
                  }
                  moveClassifications={moveClassifications}
                  disabled={exploration.isExploring}
                />
                {exploration.isExploring && exploration.exploration && (
                  <ExplorationMoveHistory
                    variationMoves={exploration.variationMoves}
                    currentPly={boardCurrentPly}
                    branchMoveIndex={exploration.exploration.analysisMoveIndex}
                    onGoToPly={goToPly}
                  />
                )}
              </div>
              <EnginePanel
                analysis={liveAnalysisEnabled ? analysis : null}
                analyzing={liveAnalysisEnabled && analyzing}
                perspective={orientation}
              />
            </div>

            <div className="bg-surface-card border border-surface-border rounded-lg p-3">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                FEN
              </span>
              <p className="font-mono text-xs text-gray-400 mt-1 break-all">
                {boardFen}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 min-h-[400px] lg:min-h-0 lg:overflow-y-auto">
            {onAnalyzeGame && (
              <MoveAnalysisPanel
                moveAnalysis={currentMoveAnalysis}
                currentPly={analysisMoveIndex}
                isExploring={exploration.isExploring}
                onTrySuggestedMove={
                  enableExploration ? handleTrySuggestedMove : undefined
                }
              />
            )}
            <div className="flex-1 min-h-[300px]">
              <CoachChat
                messages={coach.messages}
                loading={coach.loading}
                error={coach.error}
                onSend={coach.sendMessage}
                perspective={orientation}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export { useChessGame };
