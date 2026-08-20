"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyzeResponse, analyzePosition } from "@/lib/api";

const DEFAULT_DEPTH = 18;

export function useLiveAnalysis(
  fen: string,
  depth = DEFAULT_DEPTH,
  enabled = true,
) {
  const cacheRef = useRef(new Map<string, AnalyzeResponse>());
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFen = useCallback(
    async (targetFen: string, requestId: number) => {
      try {
        const result = await analyzePosition(targetFen, depth, abortRef.current?.signal);
        if (requestId !== requestIdRef.current) return;
        cacheRef.current.set(targetFen, result);
        setAnalysis(result);
        setAnalyzing(false);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        setAnalyzing(false);
      }
    },
    [depth],
  );

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      setAnalyzing(false);
      setAnalysis(null);
      setError(null);
      return;
    }

    const cached = cacheRef.current.get(fen);
    if (cached) {
      setAnalysis(cached);
      setAnalyzing(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    void analyzeFen(fen, requestId);

    return () => {
      controller.abort();
    };
  }, [fen, analyzeFen, enabled]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { analysis, analyzing, error, clearCache };
}

/** Exposed for unit tests */
export function createAnalysisCache() {
  return new Map<string, AnalyzeResponse>();
}
