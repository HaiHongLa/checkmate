export const SELECTED_GAME_KEY = "checkmate.analyze.selectedGame";

export interface ChessComGame {
  id: string;
  date: string;
  white: string;
  black: string;
  result: string;
  time_control: string | null;
  pgn: string;
  url: string;
  opening: string | null;
  user_color: string | null;
}

export interface ChessComGamesResponse {
  username: string;
  games: ChessComGame[];
}

export function storeSelectedGame(game: ChessComGame, username: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SELECTED_GAME_KEY,
      JSON.stringify({ game, username }),
    );
  } catch {
    // ignore
  }
}

export function loadSelectedGame(): { game: ChessComGame; username: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SELECTED_GAME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { game: ChessComGame; username: string };
  } catch {
    return null;
  }
}

export function formatGameMatchup(game: ChessComGame, username: string): string {
  const userLower = username.toLowerCase();
  if (game.white.toLowerCase() === userLower) {
    return `${game.white} vs ${game.black}`;
  }
  return `${game.black} vs ${game.white}`;
}

export function formatResultForUser(
  game: ChessComGame,
  username: string,
): string {
  const userLower = username.toLowerCase();
  const isWhite = game.white.toLowerCase() === userLower;
  if (game.result === "1/2-1/2") return "Draw";
  if (game.result === "1-0") return isWhite ? "Win" : "Loss";
  if (game.result === "0-1") return isWhite ? "Loss" : "Win";
  return game.result;
}
