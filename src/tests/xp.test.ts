import { describe, it, expect } from "vitest";
import { xpForLevel, levelForXp, xpToNextLevel } from "../game/xp";

describe("xpForLevel", () => {
  it("returns 0 for level 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("returns correct XP for level 2", () => {
    expect(xpForLevel(2)).toBeGreaterThan(0);
  });

  it("increases monotonically", () => {
    for (let i = 2; i <= 99; i++) {
      expect(xpForLevel(i)).toBeGreaterThan(xpForLevel(i - 1));
    }
  });

  it("roughly doubles every 7 levels", () => {
    const xp10 = xpForLevel(10) - xpForLevel(9);
    const xp17 = xpForLevel(17) - xpForLevel(16);
    const ratio = xp17 / xp10;
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2.5);
  });
});

describe("levelForXp", () => {
  it("returns 1 for 0 XP", () => {
    expect(levelForXp(0)).toBe(1);
  });

  it("returns correct level at exact boundaries", () => {
    const xpAt10 = xpForLevel(10);
    expect(levelForXp(xpAt10)).toBe(10);
    expect(levelForXp(xpAt10 - 1)).toBe(9);
  });

  it("caps at 99", () => {
    expect(levelForXp(999_999_999)).toBe(99);
  });
});

describe("xpToNextLevel", () => {
  it("returns XP needed from current XP to next level", () => {
    const result = xpToNextLevel(1, 0);
    expect(result).toBe(xpForLevel(2));
  });

  it("returns 0 at max level", () => {
    expect(xpToNextLevel(99, 999_999_999)).toBe(0);
  });
});
