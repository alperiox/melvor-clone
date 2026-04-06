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

export function renderCombatView(state: GameState, container: HTMLElement): void {
  const stats = getPlayerStats(state);
  const combatLevel = state.skills.combat.level;
  const isInCombat = state.combat !== null;

  let html = `<div class="combat-layout">`;

  // Left panel: player stats + equipment
  html += `<div class="combat-panel">
    <h3>Player</h3>
    <div class="stat-row"><span class="stat-label">Combat Lv</span><span class="stat-value">${combatLevel}</span></div>
    <div class="stat-row"><span class="stat-label">Max HP</span><span class="stat-value">${stats.maxHp}</span></div>
    <div class="stat-row"><span class="stat-label">Max Hit</span><span class="stat-value">${stats.maxHit}</span></div>
    <div class="stat-row"><span class="stat-label">Accuracy</span><span class="stat-value">${stats.accuracy}</span></div>
    <div class="stat-row"><span class="stat-label">Defence</span><span class="stat-value">${stats.defence}</span></div>
    <div class="stat-row"><span class="stat-label">Atk Speed</span><span class="stat-value">${stats.attackSpeed.toFixed(1)}s</span></div>
    <div style="margin-top: 10px;">
      <h3>Equipment</h3>
      ${renderEquipSlot("Weapon", state.equipment.weapon)}
      ${renderEquipSlot("Head", state.equipment.head)}
      ${renderEquipSlot("Body", state.equipment.body)}
      ${renderEquipSlot("Legs", state.equipment.legs)}
      ${renderEquipSlot("Feet", state.equipment.feet)}
      ${renderEquipSlot("Food", state.equipment.food, state)}
    </div>
  </div>`;

  // Center panel: area selection or active combat
  html += `<div class="combat-panel">`;
  if (isInCombat && state.combat) {
    const area = getCombatArea(state.combat.currentAreaId);
    const monster = getMonster(area.monsterIds[state.combat.currentMonsterIndex]);
    const monsterHpPct = Math.max(0, (state.combat.monsterHp / monster.hp) * 100);
    const playerHpPct = Math.max(0, (state.combat.playerHp / stats.maxHp) * 100);

    if (state.combat.respawnTimer > 0) {
      html += `<div class="respawn-text">Monster defeated! Next in ${state.combat.respawnTimer.toFixed(1)}s...</div>`;
    } else {
      html += `
        <div class="monster-name">${monster.name}</div>
        <div class="hp-text">Monster HP: ${Math.max(0, Math.ceil(state.combat.monsterHp))} / ${monster.hp}</div>
        <div class="hp-bar-container"><div class="hp-bar monster" style="width: ${monsterHpPct}%"></div></div>
        <div style="margin-top: 16px;"></div>
        <div class="hp-text">Your HP: ${Math.ceil(state.combat.playerHp)} / ${stats.maxHp}</div>
        <div class="hp-bar-container"><div class="hp-bar player" style="width: ${playerHpPct}%"></div></div>
      `;
    }
    html += `<button class="upgrade-btn" style="margin-top: 16px;" id="btn-flee">Flee</button>`;
  } else {
    html += `<h3>Combat Areas</h3><div class="area-list">`;
    for (const area of COMBAT_AREAS) {
      const locked = combatLevel < area.levelReq;
      html += `
        <div class="area-card ${locked ? 'locked' : ''}" data-area-id="${area.id}" ${locked ? '' : 'role="button"'}>
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
    <div class="loot-log">
      ${lootLog.length === 0 ? '<div style="color: var(--text-muted); font-size: 12px;">No loot yet...</div>' : ''}
      ${lootLog.map(entry => `<div class="loot-entry">${entry}</div>`).join('')}
    </div>
  </div>`;

  html += `</div>`;
  container.innerHTML = html;

  // Event handlers
  if (isInCombat) {
    document.getElementById("btn-flee")?.addEventListener("click", () => stopCombat(state));
  } else {
    container.querySelectorAll<HTMLElement>(".area-card:not(.locked)").forEach((card) => {
      card.addEventListener("click", () => startCombat(state, card.dataset.areaId!));
    });
  }
}

function renderEquipSlot(label: string, itemId: string | null, state?: GameState): string {
  if (itemId) {
    const item = getItem(itemId);
    let extra = "";
    if (label === "Food" && state) {
      const qty = getBankItemCount(state, itemId);
      extra = ` (${formatNumber(qty)})`;
    }
    return `<div class="equip-slot"><span class="slot-name">${label}</span><span class="slot-item">${item.name}${extra}</span></div>`;
  }
  return `<div class="equip-slot"><span class="slot-name">${label}</span><span class="slot-empty">Empty</span></div>`;
}
