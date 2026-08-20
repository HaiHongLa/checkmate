"use client";

import { useCallback, useState } from "react";
import {
  AnalyzeResponse,
  coachChat,
  formatEvaluation,
} from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "coach";
  content: string;
  analysis?: AnalyzeResponse;
}

export function useCoach(
  fen: string,
  moveHistory: string[],
  options?: {
    pgn?: string;
    currentMove?: number;
    welcomeMessage?: string;
    savedMoveAnalysis?: Record<string, unknown> | null;
    gameSummary?: string | null;
  },
) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "coach",
      content:
        options?.welcomeMessage ??
        "Welcome to Checkmate! I'm your AI chess coach. Make some moves on the board and ask me anything about the position.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const result = await coachChat(text.trim(), fen, moveHistory, {
          pgn: options?.pgn,
          currentMove: options?.currentMove,
          savedMoveAnalysis: options?.savedMoveAnalysis ?? undefined,
          gameSummary: options?.gameSummary ?? undefined,
        });
        const coachMsg: ChatMessage = {
          id: `coach-${Date.now()}`,
          role: "coach",
          content: result.response,
          analysis: result.analysis ?? undefined,
        };
        setMessages((prev) => [...prev, coachMsg]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reach the coach.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [fen, moveHistory, options?.pgn, options?.currentMove, options?.savedMoveAnalysis, options?.gameSummary],
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    formatEvaluation,
  };
}
