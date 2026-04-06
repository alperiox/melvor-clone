import { describe, it, expect } from "vitest";
import { getTownBonuses, canAffordUpgrade, upgradeBuilding, getBuildingUpgradeCost } from "../game/town";
import { createInitialState } from "../game/state";
import { addItem } from "../game/bank";

describe("getTownBonuses", () => {
  it("returns zeros for no buildings", () => {
    const state = createInitialState();
    const bonuses = getTownBonuses(state);
    expect(bonuses.woodcuttingSpeed).toBe(0);
    expect(bonuses.passiveGoldPerMinute).toBe(0);
  });

  it("returns correct bonuses for upgraded buildings", () => {
    const state = createInitialState();
    state.town.buildings.lumber_mill = 3;
    state.town.buildings.market = 5;
    const bonuses = getTownBonuses(state);
    expect(bonuses.woodcuttingSpeed).toBeCloseTo(0.15); // 3 * 0.05
    expect(bonuses.passiveGoldPerMinute).toBe(10); // 5 * 2
  });
});

describe("getBuildingUpgradeCost", () => {
  it("returns correct cost for level 1", () => {
    const cost = getBuildingUpgradeCost("lumber_mill", 0);
    expect(cost.gold).toBe(Math.floor(50 * 1 * 1.5));
    expect(cost.items.normal_log).toBe(Math.floor(10 * 1 * 1.5));
  });

  it("scales with level", () => {
    const cost1 = getBuildingUpgradeCost("lumber_mill", 0);
    const cost5 = getBuildingUpgradeCost("lumber_mill", 4);
    expect(cost5.gold).toBeGreaterThan(cost1.gold);
  });
});

describe("upgradeBuilding", () => {
  it("upgrades when resources are sufficient", () => {
    const state = createInitialState();
    state.gold = 10000;
    addItem(state, "normal_log", 1000);
    const success = upgradeBuilding(state, "lumber_mill");
    expect(success).toBe(true);
    expect(state.town.buildings.lumber_mill).toBe(1);
  });

  it("fails when gold is insufficient", () => {
    const state = createInitialState();
    state.gold = 0;
    addItem(state, "normal_log", 1000);
    const success = upgradeBuilding(state, "lumber_mill");
    expect(success).toBe(false);
    expect(state.town.buildings.lumber_mill).toBe(0);
  });

  it("fails at max level", () => {
    const state = createInitialState();
    state.gold = 999999;
    addItem(state, "normal_log", 99999);
    state.town.buildings.lumber_mill = 10;
    const success = upgradeBuilding(state, "lumber_mill");
    expect(success).toBe(false);
  });
});
