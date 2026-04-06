import { GameState } from "../game/types";
import { getSkillAction } from "../data/skills";
import { getMonster, getCombatArea } from "../data/monsters";
import { getEffectiveInterval } from "../game/skills";

export function updateFooter(state: GameState): void {
  const textEl = document.getElementById("footer-text")!;
  const barEl = document.getElementById("footer-bar")!;

  if (!state.activeAction) {
    textEl.textContent = "Idle";
    barEl.style.width = "0%";
    return;
  }

  if (state.activeAction.type === "skill" && state.activeAction.actionId) {
    const action = getSkillAction(state.activeAction.actionId);
    const interval = getEffectiveInterval(state, action.id);
    const progress = (state.activeAction.timer / interval) * 100;
    textEl.textContent = `${action.name}...`;
    barEl.style.width = `${Math.min(100, progress)}%`;
  } else if (state.activeAction.type === "combat" && state.combat) {
    const area = getCombatArea(state.combat.currentAreaId);
    const monster = getMonster(area.monsterIds[state.combat.currentMonsterIndex]);
    if (state.combat.respawnTimer > 0) {
      textEl.textContent = `Waiting for next monster...`;
      barEl.style.width = `${((3 - state.combat.respawnTimer) / 3) * 100}%`;
    } else {
      textEl.textContent = `Fighting ${monster.name}...`;
      const hpPercent = (state.combat.monsterHp / monster.hp) * 100;
      barEl.style.width = `${Math.max(0, 100 - hpPercent)}%`;
    }
  }
}
