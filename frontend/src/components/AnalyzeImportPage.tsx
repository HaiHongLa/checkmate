"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchChessComGames, ApiError } from "@/lib/api";
import {
  addUsername,
  formatLastUsed,
  getRememberedUsernames,
  isStorageEnabled,
  removeUsername,
  RememberedUsername,
} from "@/lib/chesscomUsernameStore";
import {
  ChessComGame,
  formatGameMatchup,
  formatResultForUser,
  storeSelectedGame,
} from "@/lib/chesscomGames";

export function AnalyzeImportPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<ChessComGame[]>([]);
  const [importedUser, setImportedUser] = useState<string | null>(null);
  const [remembered, setRemembered] = useState<RememberedUsername[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setRemembered(getRememberedUsernames());
    if (getRememberedUsernames().length === 0) {
      setShowAddForm(true);
    }
  }, []);

  async function importGames(targetUsername?: string) {
    const name = (targetUsername ?? username).trim();
    if (!name) {
      setError("Please enter a Chess.com username.");
      return;
    }

    setLoading(true);
    setError(null);
    setGames([]);

    try {
      const result = await fetchChessComGames(name);
      setGames(result.games);
      setImportedUser(result.username);
      if (remember && isStorageEnabled()) {
        addUsername(result.username);
        setRemembered(getRememberedUsernames());
      }
      setShowAddForm(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to import games. Check your connection and try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyzeGame(game: ChessComGame) {
    if (!importedUser) return;
    storeSelectedGame(game, importedUser);
    router.push("/analyze/game");
  }

  function handleDeleteRemembered(name: string) {
    removeUsername(name);
    setRemembered(getRememberedUsernames());
  }

  function handleImportRemembered(name: string) {
    setUsername(name);
    importGames(name);
  }

  return (
    <>
      <header className="border-b border-surface-border px-6 py-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Game Analysis
        </h1>
        <p className="text-xs text-gray-400">
          Import games from Chess.com and analyze them with Stockfish and your AI
          coach
        </p>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          {remembered.length > 0 && !showAddForm && (
            <section className="bg-surface-card border border-surface-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Recent accounts
              </h2>
              <div className="space-y-3">
                {remembered.map((entry) => (
                  <div
                    key={entry.username}
                    className="flex flex-wrap items-center gap-3 py-2 border-b border-surface-border/50 last:border-0"
                  >
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-white font-medium">{entry.username}</p>
                      <p className="text-xs text-gray-500">
                        Last used: {formatLastUsed(entry.lastUsed)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleImportRemembered(entry.username)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg"
                    >
                      Import
                    </button>
                    <button
                      onClick={() => handleDeleteRemembered(entry.username)}
                      className="px-3 py-1.5 text-xs font-medium border border-surface-border text-gray-400 hover:text-red-300 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-sm text-accent hover:text-accent-hover"
              >
                + Add another username
              </button>
            </section>
          )}

          {(showAddForm || remembered.length === 0) && (
            <section className="bg-surface-card border border-surface-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Chess.com Username
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  onKeyDown={(e) => e.key === "Enter" && importGames()}
                />
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={!isStorageEnabled()}
                    className="rounded border-surface-border"
                  />
                  Remember this username on this device
                </label>
                {!isStorageEnabled() && (
                  <p className="text-xs text-gray-500">
                    Local storage is unavailable in this browser.
                  </p>
                )}
                <button
                  onClick={() => importGames()}
                  disabled={loading || !username.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                >
                  {loading ? "Importing..." : "Import Games"}
                </button>
                {remembered.length > 0 && (
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="ml-3 text-sm text-gray-500 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </section>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {games.length > 0 && importedUser && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">
                Your Recent Games
              </h2>
              <div className="space-y-3">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="bg-surface-card border border-surface-border rounded-lg p-4 flex flex-wrap items-center gap-4"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs text-gray-500">{game.date}</p>
                      <p className="text-white font-medium">
                        {formatGameMatchup(game, importedUser)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {[game.time_control, game.opening, game.result]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-gray-300">
                        {formatResultForUser(game, importedUser)}
                      </p>
                      {game.user_color && (
                        <p className="text-xs text-gray-500 capitalize">
                          {game.user_color}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAnalyzeGame(game)}
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg"
                    >
                      Analyze Game
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
