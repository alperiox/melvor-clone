import { GameState } from "./types";
import { getSkillAction } from "../data/skills";
import { addItem, hasItems, removeItems } from "./bank";
import { levelForXp } from "./xp";
import { getTownBonuses } from "./town";

export interface SkillTickResult {
  actionsCompleted: number;
  successfulActions: number;
  xpGained: number;
  stoppedNoMaterials: boolean;
}

/** Start a skill action. Returns false if level requirement not met. */
export function startSkillAction(state: GameState, actionId: string): boolean {
  const action = getSkillAction(actionId);
  const skill = state.skills[action.skillId];
  if (skill.level < action.levelReq) return false;

  // Stop any current action
  state.activeAction = {
    type: "skill",
    skillId: action.skillId,
    actionId: actionId,
    timer: 0,
  };
  state.combat = null;
  return true;
}

/** Get effective interval after town speed bonuses. */
export function getEffectiveInterval(state: GameState, actionId: string): number {
  const action = getSkillAction(actionId);
  const bonuses = getTownBonuses(state);

  let speedBonus = 0;
  switch (action.skillId) {
    case "woodcutting": speedBonus = bonuses.woodcuttingSpeed; break;
    case "mining": speedBonus = bonuses.miningSpeed; break;
    case "fishing": speedBonus = bonuses.fishingSpeed; break;
    case "smithing": speedBonus = bonuses.smithingSpeed; break;
    // cooking has no speed bonus building — Kitchen gives success rate only
    case "cooking": speedBonus = 0; break;
  }

  return action.interval / (1 + speedBonus);
}

/** Process one frame tick for the active skill action. */
export function processSkillTick(state: GameState, dt: number): SkillTickResult {
  const result: SkillTickResult = { actionsCompleted: 0, successfulActions: 0, xpGained: 0, stoppedNoMaterials: false };

  if (!state.activeAction || state.activeAction.type !== "skill" || !state.activeAction.actionId) {
    return result;
  }

  const action = getSkillAction(state.activeAction.actionId);
  const interval = getEffectiveInterval(state, action.id);
  const bonuses = getTownBonuses(state);

  state.activeAction.timer += dt;

  while (state.activeAction && state.activeAction.timer >= interval) {
    state.activeAction.timer -= interval;

    // Check if we have inputs (for artisan skills)
    const hasInputs = Object.keys(action.inputs).length === 0 || hasItems(state, action.inputs);
    if (!hasInputs) {
      result.stoppedNoMaterials = true;
      state.activeAction = null;
      break;
    }

    // Consume inputs
    if (Object.keys(action.inputs).length > 0) {
      removeItems(state, action.inputs);
    }

    // Cooking success check
    if (action.baseSuccessRate !== undefined) {
      const skill = state.skills[action.skillId];
      const levelBonus = (skill.level - action.levelReq) * 0.01;
      const successRate = Math.min(1, action.baseSuccessRate + levelBonus + bonuses.cookingSuccessBonus);
      if (Math.random() > successRate) {
        // Burnt — inputs consumed, no output, but still get XP
        result.actionsCompleted++;
        state.skills[action.skillId].xp += action.xp;
        result.xpGained += action.xp;
        // Update level
        const newLevel = levelForXp(state.skills[action.skillId].xp);
        if (newLevel > state.skills[action.skillId].level) {
          state.skills[action.skillId].level = newLevel;
        }
        continue;
      }
    }

    // Produce outputs
    for (const [itemId, qty] of Object.entries(action.outputs)) {
      addItem(state, itemId, qty);
    }

    // Award XP
    state.skills[action.skillId].xp += action.xp;
    result.xpGained += action.xp;
    result.actionsCompleted++;
    result.successfulActions++;

    // Update level
    const newLevel = levelForXp(state.skills[action.skillId].xp);
    if (newLevel > state.skills[action.skillId].level) {
      state.skills[action.skillId].level = newLevel;
    }
  }

  return result;
}
