import { describe, it, expect } from "vitest";
import { processSkillTick, startSkillAction, getEffectiveInterval } from "../game/skills";
import { createInitialState } from "../game/state";
import { addItem, getBankItemCount } from "../game/bank";

describe("startSkillAction", () => {
  it("sets active action for gathering skill", () => {
    const state = createInitialState();
    startSkillAction(state, "cut_normal");
    expect(state.activeAction).toEqual({
      type: "skill",
      skillId: "woodcutting",
      actionId: "cut_normal",
      timer: 0,
    });
  });

  it("rejects action if skill level too low", () => {
    const state = createInitialState();
    const success = startSkillAction(state, "cut_oak"); // requires level 10
    expect(success).toBe(false);
    expect(state.activeAction).toBeNull();
  });
});

describe("getEffectiveInterval", () => {
  it("returns base interval with no town bonuses", () => {
    const state = createInitialState();
    const interval = getEffectiveInterval(state, "cut_normal");
    expect(interval).toBe(3);
  });

  it("reduces interval with town speed bonus", () => {
    const state = createInitialState();
    state.town.buildings.lumber_mill = 2; // +10% speed
    const interval = getEffectiveInterval(state, "cut_normal");
    expect(interval).toBeLessThan(3);
    expect(interval).toBeCloseTo(3 / 1.1, 1);
  });
});

describe("processSkillTick", () => {
  it("accumulates timer and completes action", () => {
    const state = createInitialState();
    startSkillAction(state, "cut_normal");
    // Simulate 3.1 seconds (one full action cycle at 3s interval)
    const results = processSkillTick(state, 3.1);
    expect(results.actionsCompleted).toBe(1);
    expect(state.skills.woodcutting.xp).toBe(10);
    expect(getBankItemCount(state, "normal_log")).toBe(1);
    expect(state.activeAction!.timer).toBeCloseTo(0.1, 1);
  });

  it("handles multiple completions in one tick", () => {
    const state = createInitialState();
    startSkillAction(state, "cut_normal");
    const results = processSkillTick(state, 9.5); // 3 full cycles
    expect(results.actionsCompleted).toBe(3);
    expect(state.skills.woodcutting.xp).toBe(30);
    expect(getBankItemCount(state, "normal_log")).toBe(3);
  });

  it("consumes inputs for artisan skills", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 2);
    addItem(state, "tin_ore", 2);
    startSkillAction(state, "smelt_bronze");
    const results = processSkillTick(state, 6.1); // 2 cycles
    expect(results.actionsCompleted).toBe(2);
    expect(getBankItemCount(state, "bronze_bar")).toBe(2);
    expect(getBankItemCount(state, "copper_ore")).toBe(0);
    expect(getBankItemCount(state, "tin_ore")).toBe(0);
  });

  it("stops when inputs run out", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 1);
    addItem(state, "tin_ore", 1);
    startSkillAction(state, "smelt_bronze");
    const results = processSkillTick(state, 9); // 3 potential cycles but only 1 worth of materials
    expect(results.actionsCompleted).toBe(1);
    expect(results.stoppedNoMaterials).toBe(true);
    expect(state.activeAction).toBeNull();
  });

  it("levels up the skill when XP threshold is crossed", () => {
    const state = createInitialState();
    state.skills.woodcutting.xp = 82; // xpForLevel(2) is 83, so one more action (10 XP) pushes past it
    startSkillAction(state, "cut_normal");
    processSkillTick(state, 3.1);
    expect(state.skills.woodcutting.xp).toBe(92);
    expect(state.skills.woodcutting.level).toBe(2);
  });
});
