import { GameState, BuildingId } from "../game/types";
import { BUILDINGS } from "../data/buildings";
import { getItem } from "../data/items";
import { canAffordUpgrade, upgradeBuilding, getBuildingUpgradeCost, getTownBonuses } from "../game/town";
import { formatNumber } from "../game/state";

export function renderTownView(state: GameState, container: HTMLElement): void {
  const bonuses = getTownBonuses(state);

  let html = `<div class="building-grid">`;

  for (const def of BUILDINGS) {
    const level = state.town.buildings[def.id] ?? 0;
    const isMaxed = level >= def.maxLevel;
    const canAfford = !isMaxed && canAffordUpgrade(state, def.id);

    html += `<div class="building-card">
      <div class="building-name">${def.name}</div>
      <div class="building-level">Lv ${level} / ${def.maxLevel}</div>
      <div class="building-effect">${getBonusText(def.id, level)}</div>
    `;

    if (isMaxed) {
      html += `<div class="building-maxed">MAX LEVEL</div>`;
    } else {
      const cost = getBuildingUpgradeCost(def.id, level);
      const costParts: string[] = [];
      if (cost.gold > 0) costParts.push(`${formatNumber(cost.gold)} GP`);
      for (const [itemId, qty] of Object.entries(cost.items)) {
        costParts.push(`${formatNumber(qty)} ${getItem(itemId).name}`);
      }
      html += `<div class="building-cost">Cost: ${costParts.join(", ")}</div>`;
      html += `<button class="upgrade-btn" data-building="${def.id}" ${canAfford ? '' : 'disabled'}>Upgrade</button>`;
    }

    html += `</div>`;
  }

  html += `</div>`;

  // Market passive income display
  if (bonuses.passiveGoldPerMinute > 0) {
    html += `<div style="margin-top: 16px; text-align: center; color: var(--gold); font-size: 13px;">
      Market income: +${formatNumber(bonuses.passiveGoldPerMinute)} GP/min
    </div>`;
  }

  container.innerHTML = html;

  // Upgrade click handlers
  container.querySelectorAll<HTMLButtonElement>(".upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      upgradeBuilding(state, btn.dataset.building as BuildingId);
    });
  });
}

function getBonusText(buildingId: BuildingId, level: number): string {
  if (level === 0) return "No bonus yet";
  switch (buildingId) {
    case "lumber_mill": return `+${level * 5}% Woodcutting speed`;
    case "mine_shaft": return `+${level * 5}% Mining speed`;
    case "fishery": return `+${level * 5}% Fishing speed`;
    case "forge": return `+${level * 5}% Smithing speed, +${level * 2} max hit`;
    case "kitchen": return `+${level * 10}% cooking success, +${level * 5} food healing`;
    case "barracks": return `+${level * 3}% accuracy, +${level * 5} max HP`;
    case "market": return `+${level * 2} GP/min`;
    default: return "";
  }
}
