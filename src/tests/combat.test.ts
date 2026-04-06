import { describe, it, expect, vi } from "vitest";
import { startCombat, getPlayerStats, calculateHitChance, rollLoot } from "../game/combat";
import { createInitialState } from "../game/state";
import { addItem } from "../game/bank";
import { equip } from "../game/equipment";

describe("getPlayerStats", () => {
  it("returns base stats with no equipment", () => {
    const state = createInitialState();
    const stats = getPlayerStats(state);
    expect(stats.maxHp).toBe(110); // 100 base + 10 for level 1
    expect(stats.maxHit).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(stats.defence).toBe(0);
    expect(stats.attackSpeed).toBe(3.0); // default unarmed
  });

  it("includes equipment bonuses", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    addItem(state, "bronze_platebody", 1);
    equip(state, "bronze_sword");
    equip(state, "bronze_platebody");
    const stats = getPlayerStats(state);
    expect(stats.maxHit).toBe(13); // 1 base + 12 strength
    expect(stats.accuracy).toBe(65); // 50 base + 15 accuracy
    expect(stats.defence).toBe(8);
    expect(stats.attackSpeed).toBe(2.8);
  });

  it("includes town bonuses", () => {
    const state = createInitialState();
    state.town.buildings.barracks = 3; // +9 accuracy, +15 HP
    state.town.buildings.forge = 2; // +4 max hit
    const stats = getPlayerStats(state);
    expect(stats.maxHit).toBe(5); // 1 base + 4 forge
    expect(stats.accuracy).toBe(59); // 50 base + 9 barracks
    expect(stats.maxHp).toBe(125); // 100 + 10 (level) + 15 (barracks)
  });
});

describe("calculateHitChance", () => {
  it("returns ~50% when accuracy equals evasion", () => {
    const chance = calculateHitChance(100, 100);
    expect(chance).toBeCloseTo(0.5, 1);
  });

  it("returns higher chance when accuracy is higher", () => {
    expect(calculateHitChance(200, 100)).toBeGreaterThan(0.5);
  });

  it("returns lower chance when evasion is higher", () => {
    expect(calculateHitChance(50, 200)).toBeLessThan(0.5);
  });
});

describe("startCombat", () => {
  it("sets up combat state", () => {
    const state = createInitialState();
    startCombat(state, "grasslands");
    expect(state.combat).not.toBeNull();
    expect(state.combat!.currentAreaId).toBe("grasslands");
    expect(state.combat!.monsterHp).toBe(20); // chicken HP
    expect(state.activeAction!.type).toBe("combat");
  });

  it("rejects if combat level too low", () => {
    const state = createInitialState();
    const success = startCombat(state, "forest"); // requires level 10
    expect(success).toBe(false);
    expect(state.combat).toBeNull();
  });
});

describe("rollLoot", () => {
  it("always returns gold", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no loot drops
    const loot = rollLoot("chicken");
    expect(loot.gold).toBeGreaterThanOrEqual(3);
    expect(loot.gold).toBeLessThanOrEqual(8);
    vi.restoreAllMocks();
  });
});
