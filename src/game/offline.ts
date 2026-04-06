import { GameState } from "./types";
import { getSkillAction } from "../data/skills";
import { getEffectiveInterval } from "./skills";
import { addItem, hasItems, removeItems } from "./bank";
import { levelForXp } from "./xp";
import { getTownBonuses } from "./town";

const MAX_OFFLINE_SECONDS = 86400; // 24 hours

export interface OfflineResult {
  elapsedSeconds: number;
  skillActionsCompleted: number;
  xpGained: number;
  itemsGained: Record<string, number>;
  goldGained: number;
}

export function calculateOfflineProgress(state: GameState): OfflineResult {
  const now = Date.now();
  const elapsed = Math.min((now - state.stats.lastSavedAt) / 1000, MAX_OFFLINE_SECONDS);

  const result: OfflineResult = {
    elapsedSeconds: elapsed,
    skillActionsCompleted: 0,
    xpGained: 0,
    itemsGained: {},
    goldGained: 0,
  };

  if (elapsed < 1) return result;

  // Passive gold from Market
  const bonuses = getTownBonuses(state);
  if (bonuses.passiveGoldPerMinute > 0) {
    const goldEarned = (bonuses.passiveGoldPerMinute / 60) * elapsed;
    state.gold += goldEarned;
    result.goldGained += goldEarned;
  }

  // Skill actions (combat is skipped offline per spec)
  if (state.activeAction && state.activeAction.type === "skill" && state.activeAction.actionId) {
    const action = getSkillAction(state.activeAction.actionId);
    const interval = getEffectiveInterval(state, action.id);
    let remainingTime = elapsed;

    while (remainingTime >= interval) {
      // Check inputs
      if (Object.keys(action.inputs).length > 0 && !hasItems(state, action.inputs)) {
        state.activeAction = null;
        break;
      }

      remainingTime -= interval;

      // Consume inputs
      if (Object.keys(action.inputs).length > 0) {
        removeItems(state, action.inputs);
      }

      // Success check for cooking
      let succeeded = true;
      if (action.baseSuccessRate !== undefined) {
        const skill = state.skills[action.skillId];
        const levelBonus = (skill.level - action.levelReq) * 0.01;
        const successRate = Math.min(1, action.baseSuccessRate + levelBonus + bonuses.cookingSuccessBonus);
        if (Math.random() > successRate) succeeded = false;
      }

      if (succeeded) {
        for (const [itemId, qty] of Object.entries(action.outputs)) {
          addItem(state, itemId, qty);
          result.itemsGained[itemId] = (result.itemsGained[itemId] ?? 0) + qty;
        }
      }

      state.skills[action.skillId].xp += action.xp;
      result.xpGained += action.xp;
      result.skillActionsCompleted++;

      // Update level
      const newLevel = levelForXp(state.skills[action.skillId].xp);
      if (newLevel > state.skills[action.skillId].level) {
        state.skills[action.skillId].level = newLevel;
      }
    }

    // Keep remaining time as timer progress
    if (state.activeAction) {
      state.activeAction.timer = remainingTime;
    }
  }

  // Combat is paused offline
  if (state.activeAction && state.activeAction.type === "combat") {
    state.activeAction = null;
    state.combat = null;
  }

  return result;
}
