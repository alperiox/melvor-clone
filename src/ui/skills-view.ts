import { GameState, SkillId } from "../game/types";
import { getSkillActions, getSkillAction } from "../data/skills";
import { getItem } from "../data/items";
import { startSkillAction, getEffectiveInterval } from "../game/skills";
import { hasItems } from "../game/bank";
import { xpForLevel, xpProgress, xpToNextLevel } from "../game/xp";
import { formatNumber } from "../game/state";
import { getUIState } from "./router";
import { getTownBonuses } from "../game/town";

// Track what's currently rendered to avoid unnecessary full rebuilds
let renderedSkillId: string | null = null;
let renderedLevel: number = -1;

/** Force a full rebuild on next update (call on tab switch) */
export function invalidateSkillsView(): void {
  renderedSkillId = null;
  renderedLevel = -1;
}

/** Called every tick — builds DOM if needed, then updates dynamic values */
export function renderSkillsView(state: GameState, container: HTMLElement): void {
  const ui = getUIState();
  const skillId = ui.activeSkill as SkillId;
  const skill = state.skills[skillId];

  // Full rebuild only when skill changes or level changes (new actions unlocked)
  if (skillId !== renderedSkillId || skill.level !== renderedLevel) {
    buildSkillsDOM(state, container, skillId);
    renderedSkillId = skillId;
    renderedLevel = skill.level;
  }

  // Update dynamic values every tick (no DOM rebuild)
  updateSkillsDynamic(state, container, skillId);
}

function buildSkillsDOM(state: GameState, container: HTMLElement, skillId: SkillId): void {
  const skill = state.skills[skillId];
  const actions = getSkillActions(skillId);

  let html = `
    <div class="skill-header">
      <span class="skill-name">${capitalize(skillId)}</span>
      <span class="skill-level" data-el="level">Lv ${skill.level}</span>
      <div class="xp-bar-container"><div class="xp-bar" data-el="xp-bar"></div></div>
      <span class="xp-text" data-el="xp-text"></span>
    </div>
    <div class="xp-detail" data-el="xp-detail"></div>
    <div class="action-grid">
  `;

  for (const action of actions) {
    const locked = skill.level < action.levelReq;

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
      <div class="action-card ${locked ? 'locked' : ''}" data-action-id="${action.id}">
        <div class="action-name">${action.name}</div>
        <div class="action-info">${interval.toFixed(1)}s · ${action.xp} XP</div>
        <div class="action-io">${ioText}</div>
        ${locked ? `<div class="action-req">Requires Lv ${action.levelReq}</div>` : ''}
        ${action.baseSuccessRate !== undefined && !locked ? `<div class="action-info">Success: ${Math.round(getSuccessRate(state, action) * 100)}%</div>` : ''}
      </div>
    `;
  }

  html += `</div>`;

  // Progress section (always present, shown/hidden dynamically)
  html += `
    <div class="action-progress" data-el="progress-section" style="display: none;">
      <div class="progress-label" data-el="progress-label"></div>
      <div class="progress-bar-container"><div class="progress-bar" data-el="progress-bar"></div></div>
    </div>
  `;

  container.innerHTML = html;

  // Event delegation — ONE handler for all action cards, survives across ticks
  container.onclick = (e: MouseEvent) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".action-card:not(.locked)");
    if (card?.dataset.actionId) {
      startSkillAction(state, card.dataset.actionId);
    }
  };
}

function updateSkillsDynamic(state: GameState, container: HTMLElement, skillId: SkillId): void {
  const skill = state.skills[skillId];

  // XP bar
  const xpBar = container.querySelector<HTMLElement>('[data-el="xp-bar"]');
  if (xpBar) xpBar.style.width = `${xpProgress(skill.level, skill.xp) * 100}%`;

  // XP text
  const xpText = container.querySelector<HTMLElement>('[data-el="xp-text"]');
  if (xpText) xpText.textContent = `${formatNumber(skill.xp)} / ${formatNumber(xpForLevel(skill.level + 1))} XP`;

  // Level
  const levelEl = container.querySelector<HTMLElement>('[data-el="level"]');
  if (levelEl) levelEl.textContent = `Lv ${skill.level}`;

  // XP detail line (XP remaining + time estimate)
  const xpDetail = container.querySelector<HTMLElement>('[data-el="xp-detail"]');
  if (xpDetail) {
    const remaining = xpToNextLevel(skill.level, skill.xp);
    let timeText = "";
    if (state.activeAction?.type === "skill" && state.activeAction.skillId === skillId && state.activeAction.actionId) {
      const action = getSkillAction(state.activeAction.actionId);
      const interval = getEffectiveInterval(state, action.id);
      const actionsNeeded = Math.ceil(remaining / action.xp);
      const secondsLeft = actionsNeeded * interval;
      timeText = ` · ~${formatTime(secondsLeft)} to next level`;
    }
    if (skill.level >= 99) {
      xpDetail.textContent = "MAX LEVEL";
    } else {
      xpDetail.textContent = `${formatNumber(remaining)} XP to Lv ${skill.level + 1}${timeText}`;
    }
  }

  // Active card highlight
  const activeActionId = state.activeAction?.type === "skill" && state.activeAction.skillId === skillId
    ? state.activeAction.actionId : null;

  container.querySelectorAll<HTMLElement>(".action-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.actionId === activeActionId);
  });

  // Materials warning
  container.querySelectorAll<HTMLElement>(".action-card:not(.locked)").forEach((card) => {
    const actionId = card.dataset.actionId!;
    try {
      const action = getSkillAction(actionId);
      const hasInput = Object.keys(action.inputs).length === 0 || hasItems(state, action.inputs);
      let reqEl = card.querySelector<HTMLElement>(".action-req");
      if (!hasInput && Object.keys(action.inputs).length > 0) {
        if (!reqEl) {
          reqEl = document.createElement("div");
          reqEl.className = "action-req";
          card.appendChild(reqEl);
        }
        reqEl.textContent = "Missing materials";
      } else if (reqEl && reqEl.textContent === "Missing materials") {
        reqEl.remove();
      }
    } catch { /* ignore unknown actions */ }
  });

  // Progress bar
  const progressSection = container.querySelector<HTMLElement>('[data-el="progress-section"]');
  const progressBar = container.querySelector<HTMLElement>('[data-el="progress-bar"]');
  const progressLabel = container.querySelector<HTMLElement>('[data-el="progress-label"]');

  if (activeActionId && state.activeAction && progressSection && progressBar && progressLabel) {
    const action = getSkillAction(activeActionId);
    const interval = getEffectiveInterval(state, action.id);
    const progress = (state.activeAction.timer / interval) * 100;
    progressSection.style.display = "block";
    progressLabel.textContent = `${action.name}...`;
    progressBar.style.width = `${Math.min(100, progress)}%`;
  } else if (progressSection) {
    progressSection.style.display = "none";
  }
}

function getSuccessRate(state: GameState, action: { skillId: SkillId; levelReq: number; baseSuccessRate?: number }): number {
  if (action.baseSuccessRate === undefined) return 1;
  const skill = state.skills[action.skillId];
  const levelBonus = (skill.level - action.levelReq) * 0.01;
  const bonuses = getTownBonuses(state);
  return Math.min(1, action.baseSuccessRate + levelBonus + bonuses.cookingSuccessBonus);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
