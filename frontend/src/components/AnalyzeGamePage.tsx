"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChessWorkspace, useChessGame } from "@/components/ChessWorkspace";
import {
  loadSelectedGame,
  formatGameMatchup,
} from "@/lib/chesscomGames";
import { makeGameId } from "@/lib/gameAnalysis";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";

export function AnalyzeGamePage() {
  const router = useRouter();
  const chessGame = useChessGame();
  const { loadFromPgn } = chessGame;
  const [loaded, setLoaded] = useState(false);
  const [gameMeta, setGameMeta] = useState<ReturnType<typeof loadSelectedGame>>(null);

  useEffect(() => {
    const selected = loadSelectedGame();
    if (!selected) {
      router.replace("/analyze");
      return;
    }

    const ok = loadFromPgn(selected.game.pgn);
    if (!ok) {
      router.replace("/analyze");
      return;
    }

    setGameMeta(selected);
    setLoaded(true);
  }, [loadFromPgn, router]);

  const gameId = useMemo(() => {
    if (!gameMeta) return null;
    return makeGameId("chesscom", gameMeta.game.id);
  }, [gameMeta]);

  const opponentUsername = useMemo(() => {
    if (!gameMeta) return undefined;
    const { game, username } = gameMeta;
    const userLower = username.toLowerCase();
    if (game.white.toLowerCase() === userLower) return game.black;
    return game.white;
  }, [gameMeta]);

  const {
    analysis,
    loading: analysisLoading,
    error: analysisError,
    analyze,
    reanalyze,
  } = useGameAnalysis({
    gameId,
    source: "chesscom",
    sourceGameId: gameMeta?.game.id,
    playerUsername: gameMeta?.username,
    opponentUsername,
    pgn: gameMeta?.game.pgn,
  });

  if (!loaded || !gameMeta) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Loading game...
      </div>
    );
  }

  const { game, username } = gameMeta;
  const orientation =
    game.user_color === "black" ? ("black" as const) : ("white" as const);

  return (
    <ChessWorkspace
      chessGame={chessGame}
      readOnly
      enableExploration
      coachPgn={game.pgn}
      defaultOrientation={orientation}
      showNewGame={false}
      gameAnalysis={analysis}
      gameAnalysisLoading={analysisLoading}
      gameAnalysisError={analysisError}
      onAnalyzeGame={() => void analyze()}
      onReanalyzeGame={() => void reanalyze()}
      coachWelcomeMessage="I've loaded your Chess.com game. Step through the moves, review coaching, or ask me about any position."
      headerAction={
        <Link
          href="/analyze"
          className="px-4 py-2 bg-surface-card hover:bg-surface-border border border-surface-border text-white text-sm font-medium rounded-lg transition-colors"
        >
          Back to Games
        </Link>
      }
      gameInfo={{
        title: "Game Analysis",
        subtitle: formatGameMatchup(game, username),
        meta: [
          game.date,
          game.time_control ?? undefined,
          game.opening ?? undefined,
          game.result,
        ].filter(Boolean) as string[],
      }}
    />
  );
}
