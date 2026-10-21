"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createLine,
  createRepertoire,
  deleteLine,
  deleteRepertoire,
  fetchLines,
  fetchRepertoires,
  LineSummary,
  Repertoire,
} from "@/lib/openingLab";

export function OpeningLabHome() {
  const router = useRouter();
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState<"white" | "black">("white");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRepertoires(await fetchRepertoires());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const rep = await createRepertoire(name.trim(), color);
      setName("");
      router.push(`/openings/${rep.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Opening Lab</h1>
      <p className="text-sm text-gray-400 mt-2 mb-6">
        Build a repertoire you understand — not just memorize. Create lines,
        learn the ideas, and practice recalling them.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="bg-surface-card border border-surface-border rounded-lg p-4 mb-8 space-y-3"
      >
        <h2 className="text-sm font-semibold text-gray-300">Create repertoire</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. White — Italian Game"
          className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-white text-sm"
        />
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              checked={color === "white"}
              onChange={() => setColor("white")}
            />
            White
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              checked={color === "black"}
              onChange={() => setColor("black")}
            />
            Black
          </label>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg"
        >
          Create repertoire
        </button>
      </form>

      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Your repertoires
      </h2>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : repertoires.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No repertoires yet.</p>
      ) : (
        <ul className="space-y-2">
          {repertoires.map((r) => (
            <li key={r.id}>
              <Link
                href={`/openings/${r.id}`}
                className="block px-4 py-3 bg-surface-card border border-surface-border rounded-lg hover:border-accent/40"
              >
                <span className="text-white font-medium">{r.name}</span>
                <span className="text-xs text-gray-500 ml-2 capitalize">
                  {r.color}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RepertoireDetail({
  repertoireId,
}: {
  repertoireId: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<LineSummary[]>([]);
  const [repName, setRepName] = useState("");
  const [lineName, setLineName] = useState("");
  const [color, setColor] = useState<"white" | "black">("white");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const reps = await fetchRepertoires();
      const rep = reps.find((r) => r.id === repertoireId);
      if (rep) {
        setRepName(rep.name);
        setColor(rep.color);
      }
      setLines(await fetchLines(repertoireId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, [repertoireId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    if (!lineName.trim()) return;
    try {
      const line = await createLine(repertoireId, lineName.trim());
      router.push(`/openings/${repertoireId}/lines/${line.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create line");
    }
  }

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto">
      <Link href="/openings" className="text-xs text-gray-500 hover:text-gray-300">
        ← Opening Lab
      </Link>
      <h1 className="text-2xl font-bold text-white mt-2">{repName || "Repertoire"}</h1>
      <p className="text-xs text-gray-500 capitalize mb-6">{color} pieces</p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <form
        onSubmit={(e) => void addLine(e)}
        className="bg-surface-card border border-surface-border rounded-lg p-4 mb-6 flex flex-wrap gap-2 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">New line</label>
          <input
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            placeholder="e.g. vs 1...e5 main line"
            className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-white text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg"
        >
          Add line
        </button>
      </form>

      <ul className="space-y-2 mb-6">
        {lines.map((line) => (
          <li
            key={line.id}
            className="flex items-center gap-2 px-4 py-3 bg-surface-card border border-surface-border rounded-lg"
          >
            <Link
              href={`/openings/${repertoireId}/lines/${line.id}`}
              className="flex-1 text-white hover:text-accent"
            >
              {line.name}
              <span className="text-xs text-gray-500 ml-2">
                {line.move_count} moves
              </span>
            </Link>
            <button
              type="button"
              className="text-xs text-red-400"
              onClick={() => {
                if (confirm("Delete this line?")) {
                  void deleteLine(line.id).then(load);
                }
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="text-xs text-red-400"
        onClick={() => {
          if (confirm("Delete entire repertoire?")) {
            void deleteRepertoire(repertoireId).then(() =>
              router.push("/openings"),
            );
          }
        }}
      >
        Delete repertoire
      </button>
    </div>
  );
}
