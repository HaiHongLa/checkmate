import { buildGameAtPly } from "@/hooks/useChessGame";

/** Board-only state derived from an exploration variation line. */
export interface ExplorationBoardState {
  fen: string;
  turn: "white" | "black";
  moveHistory: string[];
  fullMoveHistory: string[];
  movePairs: string[][];
  currentPly: number;
  isAtLatestMove: boolean;
  isGameOver: boolean;
  gameResult: string | null;
}

export function buildMovePairs(history: string[]): string[][] {
  const pairs: string[][] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1] ?? ""]);
  }
  return pairs;
}

export function buildExplorationBoardState(
  moves: string[],
  currentPly: number,
): ExplorationBoardState {
  const game = buildGameAtPly(moves, currentPly);
  return {
    fen: game.fen(),
    turn: game.turn() === "w" ? "white" : "black",
    moveHistory: moves.slice(0, currentPly),
    fullMoveHistory: moves,
    movePairs: buildMovePairs(moves),
    currentPly,
    isAtLatestMove: currentPly === moves.length,
    isGameOver: game.isGameOver(),
    gameResult: game.isGameOver()
      ? game.isCheckmate()
        ? `${game.turn() === "w" ? "Black" : "White"} wins by checkmate`
        : game.isDraw()
          ? "Draw"
          : "Game over"
      : null,
  };
}

/**
 * The Move Analysis panel always follows the original selected move.
 * During exploration this index is frozen and must not follow board ply.
 */
export function resolveAnalysisMoveIndex(
  isExploring: boolean,
  explorationAnalysisMoveIndex: number | null,
  originalCurrentMoveIndex: number,
): number {
  if (isExploring && explorationAnalysisMoveIndex != null) {
    return explorationAnalysisMoveIndex;
  }
  return originalCurrentMoveIndex;
}

/** Moves from the branch point onward for the exploration variation list. */
export function getExplorationVariationMoves(
  explorationMoves: string[],
  analysisMoveIndex: number,
): string[] {
  return explorationMoves.slice(Math.max(0, analysisMoveIndex - 1));
}

export function buildExplorationPrefix(
  originalMoves: string[],
  moveIndex: number,
): string[] {
  return originalMoves.slice(0, moveIndex - 1);
}
