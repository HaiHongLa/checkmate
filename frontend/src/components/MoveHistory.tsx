"use client";

interface MoveHistoryProps {
  movePairs: string[][];
  currentMoveIndex: number;
  onGoToMoveIndex: (index: number) => void;
  moveClassifications?: Record<number, string>;
  disabled?: boolean;
}

function moveButtonClass(isActive: boolean, isFuture: boolean): string {
  const base =
    "w-12 text-left px-1 py-0.5 rounded transition-colors hover:bg-surface-border/60 cursor-pointer";

  if (isActive) {
    return `${base} bg-accent/30 text-white font-semibold ring-1 ring-accent/50`;
  }
  if (isFuture) {
    return `${base} text-gray-500 hover:text-gray-300`;
  }
  return `${base} text-gray-200`;
}

function classificationDot(classification: string | undefined): string {
  switch (classification) {
    case "BLUNDER":
      return "bg-red-500";
    case "MISTAKE":
      return "bg-orange-500";
    case "INACCURACY":
      return "bg-yellow-500";
    case "GREAT":
    case "BRILLIANT":
      return "bg-emerald-500";
    default:
      return "bg-transparent";
  }
}

export function MoveHistory({
  movePairs,
  currentMoveIndex,
  onGoToMoveIndex,
  moveClassifications,
  disabled = false,
}: MoveHistoryProps) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 h-48 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Move History
      </h3>
      {movePairs.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No moves yet</p>
      ) : (
        <div className="space-y-1 font-mono text-sm">
          {movePairs.map((pair, pairIndex) => {
            const whiteIndex = pairIndex * 2 + 1;
            const blackIndex = pairIndex * 2 + 2;
            const whiteClass = moveClassifications?.[whiteIndex];
            const blackClass = moveClassifications?.[blackIndex];

            return (
              <div key={pairIndex} className="flex gap-3 items-center">
                <span className="text-gray-500 w-6 shrink-0">{pairIndex + 1}.</span>
                <div className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${classificationDot(whiteClass)}`}
                  />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onGoToMoveIndex(whiteIndex)}
                  className={`${moveButtonClass(
                    currentMoveIndex === whiteIndex,
                    whiteIndex > currentMoveIndex,
                  )}${disabled ? " opacity-60 cursor-default hover:bg-transparent" : ""}`}
                >
                    {pair[0]}
                  </button>
                </div>
                {pair[1] ? (
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${classificationDot(blackClass)}`}
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onGoToMoveIndex(blackIndex)}
                      className={`${moveButtonClass(
                        currentMoveIndex === blackIndex,
                        blackIndex > currentMoveIndex,
                      )}${disabled ? " opacity-60 cursor-default hover:bg-transparent" : ""}`}
                    >
                      {pair[1]}
                    </button>
                  </div>
                ) : (
                  <span className="w-12" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
