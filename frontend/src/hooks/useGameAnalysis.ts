"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  deleteGameAnalysis,
  fetchAnalysisStatus,
  fetchGameAnalysis,
  GameAnalysis,
  isAnalysisInProgress,
  startGameAnalysis,
} from "@/lib/gameAnalysis";

interface UseGameAnalysisOptions {
  gameId: string | null;
  source?: string;
  sourceGameId?: string;
  playerUsername?: string;
  opponentUsername?: string;
  pgn?: string;
  autoLoad?: boolean;
}

export function useGameAnalysis({
  gameId,
  source = "chesscom",
  sourceGameId,
  playerUsername,
  opponentUsername,
  pgn,
  autoLoad = true,
}: UseGameAnalysisOptions) {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!gameId) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGameAnalysis(gameId);
      setAnalysis(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setAnalysis(null);
        return null;
      }
      setError(err instanceof Error ? err.message : "Failed to load analysis");
      return null;
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const pollStatus = useCallback(async () => {
    if (!gameId) return;
    try {
      const status = await fetchAnalysisStatus(gameId);
      if (status.status === "COMPLETE" || status.status === "FAILED") {
        stopPolling();
      }
      await refresh();
    } catch {
      stopPolling();
    }
  }, [gameId, refresh, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void pollStatus();
    }, 2000);
  }, [pollStatus, stopPolling]);

  const analyze = useCallback(
    async (force = false) => {
      if (!sourceGameId || !playerUsername || !pgn) {
        setError("Missing game data for analysis.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await startGameAnalysis({
          source,
          source_game_id: sourceGameId,
          player_username: playerUsername,
          opponent_username: opponentUsername,
          pgn,
          force,
        });
        setAnalysis(data);
        if (isAnalysisInProgress(data.status)) {
          startPolling();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setLoading(false);
      }
    },
    [
      source,
      sourceGameId,
      playerUsername,
      opponentUsername,
      pgn,
      startPolling,
    ],
  );

  const reanalyze = useCallback(async () => {
    if (!gameId) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Re-analyze this game? This will regenerate Stockfish and coaching analysis.",
      )
    ) {
      return;
    }
    await deleteGameAnalysis(gameId);
    setAnalysis(null);
    await analyze(true);
  }, [analyze, gameId]);

  useEffect(() => {
    if (!autoLoad || !gameId) return;
    void refresh().then((data) => {
      if (data && isAnalysisInProgress(data.status)) {
        startPolling();
      }
    });
    return stopPolling;
  }, [autoLoad, gameId, refresh, startPolling, stopPolling]);

  return {
    analysis,
    loading,
    error,
    analyze,
    reanalyze,
    refresh,
    isInProgress: analysis ? isAnalysisInProgress(analysis.status) : false,
  };
}
