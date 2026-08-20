"use client";

import { useEffect } from "react";

function isTypingTarget(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (element as HTMLElement).isContentEditable === true;
}

interface UseKeyboardNavigationOptions {
  onPrevious: () => void;
  onNext: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onPrevious,
  onNext,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrevious, onNext, enabled]);
}

export { isTypingTarget };
