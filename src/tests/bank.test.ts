import { describe, it, expect } from "vitest";
import { addItem, removeItem, hasItems, sellItem, getBankItemCount } from "../game/bank";
import { equip, unequip, getEquippedStats } from "../game/equipment";
import { createInitialState } from "../game/state";

describe("bank", () => {
  it("addItem increases quantity", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    expect(getBankItemCount(state, "copper_ore")).toBe(5);
  });

  it("addItem stacks on existing", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    addItem(state, "copper_ore", 3);
    expect(getBankItemCount(state, "copper_ore")).toBe(8);
  });

  it("removeItem decreases quantity", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    const success = removeItem(state, "copper_ore", 3);
    expect(success).toBe(true);
    expect(getBankItemCount(state, "copper_ore")).toBe(2);
  });

  it("removeItem fails if not enough", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 2);
    const success = removeItem(state, "copper_ore", 5);
    expect(success).toBe(false);
    expect(getBankItemCount(state, "copper_ore")).toBe(2);
  });

  it("removeItem cleans up zero entries", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 3);
    removeItem(state, "copper_ore", 3);
    expect(state.bank["copper_ore"]).toBeUndefined();
  });

  it("hasItems checks multiple items", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    addItem(state, "tin_ore", 3);
    expect(hasItems(state, { copper_ore: 5, tin_ore: 3 })).toBe(true);
    expect(hasItems(state, { copper_ore: 5, tin_ore: 4 })).toBe(false);
  });

  it("sellItem adds gold and removes item", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 10);
    sellItem(state, "copper_ore", 5);
    expect(getBankItemCount(state, "copper_ore")).toBe(5);
    expect(state.gold).toBe(10); // copper_ore sellPrice = 2, 5 * 2 = 10
  });
});

describe("equipment", () => {
  it("equip moves item from bank to slot", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    equip(state, "bronze_sword");
    expect(state.equipment.weapon).toBe("bronze_sword");
    expect(getBankItemCount(state, "bronze_sword")).toBe(0);
  });

  it("equip swaps existing equipment back to bank", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    addItem(state, "iron_sword", 1);
    equip(state, "bronze_sword");
    equip(state, "iron_sword");
    expect(state.equipment.weapon).toBe("iron_sword");
    expect(getBankItemCount(state, "bronze_sword")).toBe(1);
    expect(getBankItemCount(state, "iron_sword")).toBe(0);
  });

  it("unequip returns item to bank", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    equip(state, "bronze_sword");
    unequip(state, "weapon");
    expect(state.equipment.weapon).toBeNull();
    expect(getBankItemCount(state, "bronze_sword")).toBe(1);
  });

  it("getEquippedStats sums all equipment bonuses", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    addItem(state, "bronze_platebody", 1);
    equip(state, "bronze_sword");
    equip(state, "bronze_platebody");
    const stats = getEquippedStats(state);
    expect(stats.strengthBonus).toBe(12);    // bronze sword
    expect(stats.accuracyBonus).toBe(15);    // bronze sword
    expect(stats.defenceBonus).toBe(8);      // bronze platebody
    expect(stats.hpBonus).toBe(5);           // bronze platebody
    expect(stats.attackSpeed).toBe(2.8);     // bronze sword
  });
});
