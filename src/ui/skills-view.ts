import { GameState, SkillId } from "../game/types";
import { getSkillActions } from "../data/skills";
import { getItem } from "../data/items";
import { startSkillAction, getEffectiveInterval } from "../game/skills";
import { hasItems } from "../game/bank";
import { xpForLevel, xpProgress } from "../game/xp";
import { formatNumber } from "../game/state";
import { getUIState } from "./router";

export function renderSkillsView(state: GameState, container: HTMLElement): void {
  const ui = getUIState();
  const skillId = ui.activeSkill as SkillId;
  const skill = state.skills[skillId];
  const actions = getSkillActions(skillId);

  const activeActionId = state.activeAction?.type === "skill" && state.activeAction.skillId === skillId
    ? state.activeAction.actionId
    : null;

  let html = `
    <div class="skill-header">
      <span class="skill-name">${capitalize(skillId)}</span>
      <span class="skill-level">Lv ${skill.level}</span>
      <div class="xp-bar-container"><div class="xp-bar" style="width: ${xpProgress(skill.level, skill.xp) * 100}%"></div></div>
      <span class="xp-text">${formatNumber(skill.xp)} / ${formatNumber(xpForLevel(skill.level + 1))} XP</span>
    </div>
    <div class="action-grid">
  `;

  for (const action of actions) {
    const locked = skill.level < action.levelReq;
    const isActive = activeActionId === action.id;
    const hasInput = Object.keys(action.inputs).length === 0 || hasItems(state, action.inputs);

    let ioText = "";
    const inputParts = Object.entries(action.inputs).map(([id, qty]) => `${getItem(id).name} ×${qty}`);
    const outputParts = Object.entries(action.outputs).map(([id, qty]) => `${getItem(id).name} ×${qty}`);
    if (inputParts.length > 0) {
      ioText = `${inputParts.join(", ")} → ${outputParts.join(", ")}`;
    } else {
      ioText = outputParts.join(", ");
    }

    const interval = locked ? action.interval : getEffectiveInterval(state, action.id);

    html += `
      <div class="action-card ${locked ? 'locked' : ''} ${isActive ? 'active' : ''}"
           data-action-id="${action.id}" ${locked ? '' : 'role="button"'}>
        <div class="action-name">${action.name}</div>
        <div class="action-info">${interval.toFixed(1)}s · ${action.xp} XP</div>
        <div class="action-io">${ioText}</div>
        ${locked ? `<div class="action-req">Requires Lv ${action.levelReq}</div>` : ''}
        ${!locked && !hasInput ? `<div class="action-req">Missing materials</div>` : ''}
        ${action.baseSuccessRate !== undefined && !locked ? `<div class="action-info">Success: ${Math.round(getSuccessRate(state, action) * 100)}%</div>` : ''}
      </div>
    `;
  }

  html += `</div>`;

  // Active action progress
  if (activeActionId && state.activeAction) {
    const action = actions.find(a => a.id === activeActionId);
    if (action) {
      const interval = getEffectiveInterval(state, action.id);
      const progress = (state.activeAction.timer / interval) * 100;
      html += `
        <div class="action-progress">
          <div class="progress-label">${action.name}...</div>
          <div class="progress-bar-container"><div class="progress-bar" style="width: ${Math.min(100, progress)}%"></div></div>
        </div>
      `;
    }
  }

  container.innerHTML = html;

  // Attach click handlers
  container.querySelectorAll<HTMLElement>(".action-card:not(.locked)").forEach((card) => {
    card.addEventListener("click", () => {
      const actionId = card.dataset.actionId!;
      startSkillAction(state, actionId);
    });
  });
}

function getSuccessRate(state: GameState, action: { skillId: SkillId; levelReq: number; baseSuccessRate?: number }): number {
  if (action.baseSuccessRate === undefined) return 1;
  const skill = state.skills[action.skillId];
  const levelBonus = (skill.level - action.levelReq) * 0.01;
  // Note: town cooking success bonus would be added here in actual processing
  return Math.min(1, action.baseSuccessRate + levelBonus);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
