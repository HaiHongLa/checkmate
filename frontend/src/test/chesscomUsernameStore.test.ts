import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addUsername,
  getRememberedUsernames,
  removeUsername,
  formatLastUsed,
} from "@/lib/chesscomUsernameStore";

describe("chesscomUsernameStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty list when nothing stored", () => {
    expect(getRememberedUsernames()).toEqual([]);
  });

  it("adds and retrieves usernames without duplicates", () => {
    addUsername("HaiLa");
    addUsername("HaiLa");
    addUsername("OtherPlayer");

    const entries = getRememberedUsernames();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.username)).toContain("HaiLa");
    expect(entries.map((e) => e.username)).toContain("OtherPlayer");
  });

  it("removes usernames case-insensitively", () => {
    addUsername("HaiLa");
    removeUsername("haila");
    expect(getRememberedUsernames()).toHaveLength(0);
  });

  it("handles unavailable localStorage", () => {
    const getItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => addUsername("test")).not.toThrow();
    getItem.mockRestore();
  });

  it("formats recent last used", () => {
    expect(formatLastUsed(new Date().toISOString())).toBe("Recently");
  });
});
