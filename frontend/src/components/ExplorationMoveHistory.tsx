"use client";

function moveLabel(ply: number): string {
  const moveNum = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
}

interface ExplorationMoveHistoryProps {
  variationMoves: string[];
  currentPly: number;
  branchMoveIndex: number;
  onGoToPly: (ply: number) => void;
}

function moveButtonClass(isActive: boolean, isFuture: boolean): string {
  const base =
    "text-left px-1 py-0.5 rounded transition-colors hover:bg-surface-border/60 cursor-pointer text-amber-200";

  if (isActive) {
    return `${base} bg-amber-700/40 font-semibold ring-1 ring-amber-500/50`;
  }
  if (isFuture) {
    return `${base} text-amber-700 hover:text-amber-400`;
  }
  return base;
}

export function ExplorationMoveHistory({
  variationMoves,
  currentPly,
  branchMoveIndex,
  onGoToPly,
}: ExplorationMoveHistoryProps) {
  if (variationMoves.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-4 max-h-40 overflow-y-auto">
      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
        Exploring Alternative
      </h3>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
        {variationMoves.map((san, index) => {
          const ply = branchMoveIndex + index;
          return (
            <button
              key={`${ply}-${san}`}
              type="button"
              onClick={() => onGoToPly(ply)}
              className={moveButtonClass(
                currentPly === ply,
                ply > currentPly,
              )}
            >
              <span className="text-amber-700 mr-1">{moveLabel(ply)}</span>
              {san}
            </button>
          );
        })}
      </div>
    </div>
  );
}
