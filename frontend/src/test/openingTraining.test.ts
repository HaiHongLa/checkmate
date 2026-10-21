import { describe, expect, it } from "vitest";
import { resolveAnalysisMoveIndex } from "@/lib/explorationState";

describe("opening training learn context", () => {
  it("keeps learn ply fixed while board ply would advance", () => {
    const learnPly = 4;
    expect(resolveAnalysisMoveIndex(true, learnPly, 7)).toBe(4);
    expect(resolveAnalysisMoveIndex(true, learnPly, 8)).toBe(4);
  });
});
