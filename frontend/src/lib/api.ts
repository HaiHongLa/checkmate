import type { ChessComGame } from "./chesscomGames";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AnalyzeResponse {
  evaluation: number;
  best_move: string;
  principal_variation: string[];
  depth: number;
  mate_in: number | null;
}

export interface CoachChatResponse {
  response: string;
  analysis: AnalyzeResponse | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(detail, response.status);
  }
  return response.json();
}

export async function analyzePosition(
  fen: string,
  depth = 15,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_URL}/api/chess/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen, depth }),
    signal,
  });
  return handleResponse<AnalyzeResponse>(response);
}

export async function coachChat(
  message: string,
  fen: string,
  moveHistory: string[],
  options?: {
    pgn?: string;
    currentMove?: number;
    savedMoveAnalysis?: Record<string, unknown>;
    gameSummary?: string;
  },
): Promise<CoachChatResponse> {
  const response = await fetch(`${API_URL}/api/coach/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      fen,
      move_history: moveHistory,
      pgn: options?.pgn,
      current_move: options?.currentMove,
      saved_move_analysis: options?.savedMoveAnalysis,
      game_summary: options?.gameSummary,
    }),
  });
  return handleResponse<CoachChatResponse>(response);
}

export async function fetchChessComGames(
  username: string,
  limit = 20,
): Promise<{ username: string; games: ChessComGame[] }> {
  const response = await fetch(
    `${API_URL}/api/chesscom/${encodeURIComponent(username)}/games?limit=${limit}`,
  );
  return handleResponse(response);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function formatEvaluation(
  data: AnalyzeResponse,
  perspective: "white" | "black" = "white",
): string {
  const flip = perspective === "black";

  if (data.mate_in !== null) {
    const mate = flip ? -data.mate_in : data.mate_in;
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  }

  const evaluation = flip ? -data.evaluation : data.evaluation;
  const sign = evaluation > 0 ? "+" : "";
  return `${sign}${evaluation.toFixed(2)}`;
}

export function getEvaluationValue(
  data: AnalyzeResponse,
  perspective: "white" | "black" = "white",
): number {
  if (data.mate_in !== null) {
    const mate = perspective === "black" ? -data.mate_in : data.mate_in;
    return mate > 0 ? 100 : mate < 0 ? -100 : 0;
  }
  return perspective === "black" ? -data.evaluation : data.evaluation;
}
