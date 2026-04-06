import { GameState } from "../game/types";
import { COMBAT_AREAS, getMonster, getCombatArea } from "../data/monsters";
import { getItem } from "../data/items";
import { startCombat, stopCombat, getPlayerStats } from "../game/combat";
import { getBankItemCount } from "../game/bank";
import { formatNumber } from "../game/state";

// In-memory loot log (not persisted)
const lootLog: string[] = [];
const MAX_LOOT_LOG = 50;

export function addLootLogEntry(entry: string): void {
  lootLog.unshift(entry);
  if (lootLog.length > MAX_LOOT_LOG) lootLog.pop();
}

// Track state to know when to rebuild
let renderedCombatState: "idle" | "fighting" | "respawn" = "idle";
let renderedMonsterIndex = -1;
let renderedLootLogLen = -1;
let renderedCombatLevel = -1;

export function invalidateCombatView(): void {
  renderedCombatState = "idle";
  renderedMonsterIndex = -1;
  renderedLootLogLen = -1;
  renderedCombatLevel = -1;
}

export function renderCombatView(state: GameState, container: HTMLElement): void {
  const isInCombat = state.combat !== null;
  const currentState: "idle" | "fighting" | "respawn" = !isInCombat ? "idle"
    : (state.combat!.respawnTimer > 0 ? "respawn" : "fighting");
  const monsterIdx = state.combat?.currentMonsterIndex ?? -1;
  const combatLevel = state.skills.combat.level;

  // Full rebuild when combat state transitions, monster changes, level changes, or loot log grows
  const needsRebuild = currentState !== renderedCombatState
    || monsterIdx !== renderedMonsterIndex
    || combatLevel !== renderedCombatLevel
    || lootLog.length !== renderedLootLogLen;

  if (needsRebuild) {
    buildCombatDOM(state, container);
    renderedCombatState = currentState;
    renderedMonsterIndex = monsterIdx;
    renderedCombatLevel = combatLevel;
    renderedLootLogLen = lootLog.length;
  }

  updateCombatDynamic(state, container);
}

function buildCombatDOM(state: GameState, container: HTMLElement): void {
  const stats = getPlayerStats(state);
  const combatLevel = state.skills.combat.level;
  const isInCombat = state.combat !== null;

  let html = `<div class="combat-layout">`;

  // Left panel: player stats + equipment
  html += `<div class="combat-panel">
    <h3>Player</h3>
    <div class="stat-row"><span class="stat-label">Combat Lv</span><span class="stat-value" data-el="combat-lv">${combatLevel}</span></div>
    <div class="stat-row"><span class="stat-label">Max HP</span><span class="stat-value" data-el="stat-maxhp">${stats.maxHp}</span></div>
    <div class="stat-row"><span class="stat-label">Max Hit</span><span class="stat-value" data-el="stat-maxhit">${stats.maxHit}</span></div>
    <div class="stat-row"><span class="stat-label">Accuracy</span><span class="stat-value" data-el="stat-acc">${stats.accuracy}</span></div>
    <div class="stat-row"><span class="stat-label">Defence</span><span class="stat-value" data-el="stat-def">${stats.defence}</span></div>
    <div class="stat-row"><span class="stat-label">Atk Speed</span><span class="stat-value">${stats.attackSpeed.toFixed(1)}s</span></div>
    <div style="margin-top: 10px;">
      <h3>Equipment</h3>
      ${renderEquipSlot("Weapon", state.equipment.weapon)}
      ${renderEquipSlot("Head", state.equipment.head)}
      ${renderEquipSlot("Body", state.equipment.body)}
      ${renderEquipSlot("Legs", state.equipment.legs)}
      ${renderEquipSlot("Feet", state.equipment.feet)}
      <div class="equip-slot">
        <span class="slot-name">Food</span>
        <span data-el="food-slot">${state.equipment.food ? `${getItem(state.equipment.food).name} (<span data-el="food-qty">${formatNumber(getBankItemCount(state, state.equipment.food))}</span>)` : '<span class="slot-empty">Empty</span>'}</span>
      </div>
    </div>
  </div>`;

  // Center panel
  html += `<div class="combat-panel" data-el="center-panel">`;
  if (isInCombat && state.combat) {
    const area = getCombatArea(state.combat.currentAreaId);
    const monster = getMonster(area.monsterIds[state.combat.currentMonsterIndex]);

    if (state.combat.respawnTimer > 0) {
      html += `<div class="respawn-text" data-el="respawn-text">Monster defeated! Next in ${state.combat.respawnTimer.toFixed(1)}s...</div>`;
    } else {
      html += `
        <div class="monster-name">${monster.name}</div>
        <div class="hp-text" data-el="monster-hp-text">Monster HP: ${Math.max(0, Math.ceil(state.combat.monsterHp))} / ${monster.hp}</div>
        <div class="hp-bar-container"><div class="hp-bar monster" data-el="monster-hp-bar" style="width: ${Math.max(0, (state.combat.monsterHp / monster.hp) * 100)}%"></div></div>
        <div style="margin-top: 16px;"></div>
        <div class="hp-text" data-el="player-hp-text">Your HP: ${Math.ceil(state.combat.playerHp)} / ${getPlayerStats(state).maxHp}</div>
        <div class="hp-bar-container"><div class="hp-bar player" data-el="player-hp-bar" style="width: ${Math.max(0, (state.combat.playerHp / getPlayerStats(state).maxHp) * 100)}%"></div></div>
      `;
    }
    html += `<button class="upgrade-btn" style="margin-top: 16px;" data-el="flee-btn">Flee</button>`;
  } else {
    html += `<h3>Combat Areas</h3><div class="area-list">`;
    for (const area of COMBAT_AREAS) {
      const locked = state.skills.combat.level < area.levelReq;
      html += `
        <div class="area-card ${locked ? 'locked' : ''}" data-area-id="${area.id}">
          <div class="area-name">${area.name}</div>
          <div class="area-req">${locked ? `Requires Combat Lv ${area.levelReq}` : `Lv ${area.levelReq}+`}</div>
          <div class="action-info">${area.monsterIds.map(id => getMonster(id).name).join(", ")}</div>
        </div>
      `;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Right panel: loot log
  html += `<div class="combat-panel">
    <h3>Loot Log</h3>
    <div class="loot-log" data-el="loot-log">
      ${lootLog.length === 0 ? '<div style="color: var(--text-muted); font-size: 12px;">No loot yet...</div>' : ''}
      ${lootLog.map(entry => `<div class="loot-entry">${entry}</div>`).join('')}
    </div>
  </div>`;

  html += `</div>`;
  container.innerHTML = html;

  // Event delegation
  container.onclick = (e: MouseEvent) => {
    const fleeBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-el="flee-btn"]');
    if (fleeBtn) {
      stopCombat(state);
      invalidateCombatView();
      return;
    }
    const areaCard = (e.target as HTMLElement).closest<HTMLElement>(".area-card:not(.locked)");
    if (areaCard?.dataset.areaId) {
      startCombat(state, areaCard.dataset.areaId);
      invalidateCombatView();
    }
  };
}

function updateCombatDynamic(state: GameState, container: HTMLElement): void {
  if (!state.combat) return;

  const stats = getPlayerStats(state);
  const area = getCombatArea(state.combat.currentAreaId);
  const monster = getMonster(area.monsterIds[state.combat.currentMonsterIndex]);

  // HP bars
  const monsterHpBar = container.querySelector<HTMLElement>('[data-el="monster-hp-bar"]');
  const monsterHpText = container.querySelector<HTMLElement>('[data-el="monster-hp-text"]');
  const playerHpBar = container.querySelector<HTMLElement>('[data-el="player-hp-bar"]');
  const playerHpText = container.querySelector<HTMLElement>('[data-el="player-hp-text"]');

  if (monsterHpBar) monsterHpBar.style.width = `${Math.max(0, (state.combat.monsterHp / monster.hp) * 100)}%`;
  if (monsterHpText) monsterHpText.textContent = `Monster HP: ${Math.max(0, Math.ceil(state.combat.monsterHp))} / ${monster.hp}`;
  if (playerHpBar) playerHpBar.style.width = `${Math.max(0, (state.combat.playerHp / stats.maxHp) * 100)}%`;
  if (playerHpText) playerHpText.textContent = `Your HP: ${Math.ceil(state.combat.playerHp)} / ${stats.maxHp}`;

  // Respawn timer
  const respawnText = container.querySelector<HTMLElement>('[data-el="respawn-text"]');
  if (respawnText && state.combat.respawnTimer > 0) {
    respawnText.textContent = `Monster defeated! Next in ${state.combat.respawnTimer.toFixed(1)}s...`;
  }

  // Food quantity
  const foodQty = container.querySelector<HTMLElement>('[data-el="food-qty"]');
  if (foodQty && state.equipment.food) {
    foodQty.textContent = formatNumber(getBankItemCount(state, state.equipment.food));
  }

  // Player stats (may change from town upgrades)
  const statMaxHp = container.querySelector<HTMLElement>('[data-el="stat-maxhp"]');
  const statMaxHit = container.querySelector<HTMLElement>('[data-el="stat-maxhit"]');
  const statAcc = container.querySelector<HTMLElement>('[data-el="stat-acc"]');
  const statDef = container.querySelector<HTMLElement>('[data-el="stat-def"]');
  if (statMaxHp) statMaxHp.textContent = String(stats.maxHp);
  if (statMaxHit) statMaxHit.textContent = String(stats.maxHit);
  if (statAcc) statAcc.textContent = String(stats.accuracy);
  if (statDef) statDef.textContent = String(stats.defence);
}

function renderEquipSlot(label: string, itemId: string | null): string {
  if (itemId) {
    const item = getItem(itemId);
    return `<div class="equip-slot"><span class="slot-name">${label}</span><span class="slot-item">${item.name}</span></div>`;
  }
  return `<div class="equip-slot"><span class="slot-name">${label}</span><span class="slot-empty">Empty</span></div>`;
}
