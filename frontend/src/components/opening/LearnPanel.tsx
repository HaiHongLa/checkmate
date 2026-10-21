"use client";

import { Explanation } from "@/lib/openingLab";

interface LearnPanelProps {
  plyIndex: number;
  repertoireMove: string | null;
  explanation: Explanation | null;
  isKey: boolean;
  onToggleKey: () => void;
  onGenerate: () => void;
  generating: boolean;
}

export function LearnPanel({
  plyIndex,
  repertoireMove,
  explanation,
  isKey,
  onToggleKey,
  onGenerate,
  generating,
}: LearnPanelProps) {
  if (plyIndex <= 0) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Learn
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Step to a position in your line to see teaching content.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-3 max-h-[480px] overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Learn
          </h3>
          {repertoireMove && (
            <p className="font-mono text-lg text-white mt-1">{repertoireMove}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleKey}
          className={`text-xs px-2 py-1 rounded border ${
            isKey
              ? "border-accent text-accent"
              : "border-surface-border text-gray-500"
          }`}
        >
          {isKey ? "Key position" : "Mark key"}
        </button>
      </div>

      {!explanation ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            No saved explanation for this position yet.
          </p>
          <button
            type="button"
            disabled={generating || !isKey}
            onClick={onGenerate}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate for key positions"}
          </button>
          {!isKey && (
            <p className="text-xs text-gray-600">
              Mark as key position or use batch generate from the toolbar.
            </p>
          )}
        </div>
      ) : (
        <>
          <Section title="Why this move?" text={explanation.why_move} />
          <Section title="Strategic idea" text={explanation.strategic_idea} />
          <Section title="Plan" text={explanation.plan_text} />
          <Section title="What to watch for" text={explanation.watch_for} />
          {explanation.remember_this && (
            <div className="border-t border-surface-border pt-3">
              <p className="text-xs text-amber-400 uppercase tracking-wide">
                Remember this
              </p>
              <p className="text-sm text-amber-100 font-medium mt-1">
                {explanation.remember_this}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-sm text-gray-300 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}
