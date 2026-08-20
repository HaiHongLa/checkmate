import { API_URL, ApiError } from "@/lib/api";

export type AnalysisStatus =
  | "NOT_ANALYZED"
  | "QUEUED"
  | "ANALYZING"
  | "GENERATING_COACHING"
  | "COMPLETE"
  | "FAILED";

export interface MoveAnalysis {
  move_index: number;
  move_number: number;
  side: string;
  san: string;
  uci: string;
  fen_before: string;
  fen_after: string;
  evaluation_before: number | null;
  evaluation_after: number | null;
  best_move: string | null;
  best_move_san: string | null;
  principal_variation: string[];
  centipawn_loss: number;
  classification: string;
  is_critical: boolean;
  coaching_headline: string | null;
  coaching_explanation: string | null;
  coaching_teaching_point: string | null;
  coaching_encouragement: string | null;
  suggested_move: string | null;
  suggested_move_san: string | null;
  suggested_line: string | null;
  coaching_generated: boolean;
}

export interface GameAnalysis {
  game_id: string;
  source: string;
  source_game_id: string;
  player_username: string;
  opponent_username: string | null;
  status: AnalysisStatus;
  summary: string | null;
  white_accuracy: number | null;
  black_accuracy: number | null;
  white_game_rating: number | null;
  black_game_rating: number | null;
  engine_version: string | null;
  engine_depth: number | null;
  analysis_version: string;
  generated_at: string | null;
  progress_message: string | null;
  progress_current: number;
  progress_total: number;
  error_message: string | null;
  moves: MoveAnalysis[];
}

export interface GameAnalysisStatus {
  game_id: string;
  status: AnalysisStatus;
  progress_message: string | null;
  progress_current: number;
  progress_total: number;
  error_message: string | null;
  generated_at: string | null;
}

export function makeGameId(source: string, sourceGameId: string): string {
  return `${source}:${sourceGameId}`;
}

export function isAnalysisInProgress(status: AnalysisStatus): boolean {
  return (
    status === "QUEUED" ||
    status === "ANALYZING" ||
    status === "GENERATING_COACHING"
  );
}

export function classificationLabel(classification: string): string {
  return classification.replace(/_/g, " ");
}

export function classificationColor(classification: string): string {
  switch (classification) {
    case "BRILLIANT":
    case "GREAT":
      return "text-emerald-400";
    case "GOOD":
    case "BOOK":
    case "FORCED":
      return "text-green-400";
    case "INACCURACY":
      return "text-yellow-400";
    case "MISTAKE":
      return "text-orange-400";
    case "BLUNDER":
      return "text-red-400";
    default:
      return "text-gray-300";
  }
}

async function handleResponseLocal<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status);
  }
  return response.json();
}

export async function fetchGameAnalysis(gameId: string): Promise<GameAnalysis> {
  const response = await fetch(
    `${API_URL}/api/games/${encodeURIComponent(gameId)}/analysis`,
  );
  return handleResponseLocal<GameAnalysis>(response);
}

export async function fetchAnalysisStatus(
  gameId: string,
): Promise<GameAnalysisStatus> {
  const response = await fetch(
    `${API_URL}/api/games/${encodeURIComponent(gameId)}/analysis/status`,
  );
  return handleResponseLocal<GameAnalysisStatus>(response);
}

export async function startGameAnalysis(input: {
  source: string;
  source_game_id: string;
  player_username: string;
  opponent_username?: string;
  pgn: string;
  force?: boolean;
}): Promise<GameAnalysis> {
  const response = await fetch(`${API_URL}/api/games/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponseLocal<GameAnalysis>(response);
}

export async function deleteGameAnalysis(gameId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/games/${encodeURIComponent(gameId)}/analysis`,
    { method: "DELETE" },
  );
  await handleResponseLocal(response);
}

export function getMoveAnalysisForPly(
  analysis: GameAnalysis | null,
  ply: number,
): MoveAnalysis | null {
  if (!analysis || ply <= 0) return null;
  return analysis.moves.find((m) => m.move_index === ply) ?? null;
}

export function countClassifications(moves: MoveAnalysis[]) {
  const counts: Record<string, number> = {};
  for (const move of moves) {
    counts[move.classification] = (counts[move.classification] ?? 0) + 1;
  }
  return counts;
}
