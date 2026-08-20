"use client";

interface MoveNavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function MoveNavigationControls({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: MoveNavigationControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Previous move"
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-card hover:bg-surface-border disabled:opacity-30 disabled:cursor-not-allowed border border-surface-border text-gray-200 text-lg font-medium transition-colors"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next move"
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-card hover:bg-surface-border disabled:opacity-30 disabled:cursor-not-allowed border border-surface-border text-gray-200 text-lg font-medium transition-colors"
      >
        ›
      </button>
    </div>
  );
}
