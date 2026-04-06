import { GameState, EquipSlot } from "../game/types";
import { ITEMS, getItem } from "../data/items";
import { sellItem, getBankItemCount } from "../game/bank";
import { equip, unequip } from "../game/equipment";
import { formatNumber } from "../game/state";
import { getUIState, selectBankItem } from "./router";

export function renderBankView(state: GameState, container: HTMLElement): void {
  const ui = getUIState();
  const filter = ui.bankFilter;

  // Collect all items in bank
  const bankEntries = Object.entries(state.bank)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty, def: ITEMS[id] }))
    .filter((e) => e.def !== undefined)
    .filter((e) => filter === "all" || e.def.category === filter)
    .sort((a, b) => {
      const catOrder = { resource: 0, food: 1, equipment: 2 };
      return (catOrder[a.def.category] ?? 9) - (catOrder[b.def.category] ?? 9);
    });

  let html = `<div style="display: flex; gap: 16px;">`;

  // Item grid
  html += `<div style="flex: 1;"><div class="bank-grid">`;
  if (bankEntries.length === 0) {
    html += `<div style="grid-column: 1/-1; color: var(--text-muted); padding: 20px; text-align: center;">Bank is empty</div>`;
  }
  for (const entry of bankEntries) {
    const selected = ui.selectedBankItem === entry.id;
    html += `
      <div class="bank-item ${selected ? 'selected' : ''}" data-item-id="${entry.id}" role="button">
        <div class="item-name">${entry.def.name}</div>
        <div class="item-qty">${formatNumber(entry.qty)}</div>
      </div>
    `;
  }
  html += `</div></div>`;

  // Context panel (if item selected)
  if (ui.selectedBankItem && state.bank[ui.selectedBankItem]) {
    const item = getItem(ui.selectedBankItem);
    const qty = getBankItemCount(state, ui.selectedBankItem);

    html += `<div style="width: 260px; flex-shrink: 0;">
      <div class="combat-panel">
        <div class="context-name">${item.name}</div>
        <div class="context-category">${item.category}</div>
        <div style="margin-top: 4px; font-size: 12px; color: var(--text-dim);">Owned: ${formatNumber(qty)}</div>
        <div class="context-stats">`;

    if (item.healAmount) {
      html += `<div class="stat-row"><span class="stat-label">Heals</span><span class="stat-value">${item.healAmount} HP</span></div>`;
    }
    if (item.attackSpeed !== undefined) {
      html += `<div class="stat-row"><span class="stat-label">Atk Speed</span><span class="stat-value">${item.attackSpeed}s</span></div>`;
    }
    if (item.strengthBonus) {
      html += `<div class="stat-row"><span class="stat-label">Strength</span><span class="stat-value">+${item.strengthBonus}</span></div>`;
    }
    if (item.accuracyBonus) {
      html += `<div class="stat-row"><span class="stat-label">Accuracy</span><span class="stat-value">+${item.accuracyBonus}</span></div>`;
    }
    if (item.defenceBonus) {
      html += `<div class="stat-row"><span class="stat-label">Defence</span><span class="stat-value">+${item.defenceBonus}</span></div>`;
    }
    if (item.hpBonus) {
      html += `<div class="stat-row"><span class="stat-label">HP Bonus</span><span class="stat-value">+${item.hpBonus}</span></div>`;
    }

    html += `</div>`;

    // Equip/unequip button
    if (item.equipSlot) {
      const isEquipped = state.equipment[item.equipSlot] === ui.selectedBankItem;
      if (isEquipped) {
        html += `<button class="context-btn unequip" data-action="unequip" data-slot="${item.equipSlot}">Unequip</button>`;
      } else {
        html += `<button class="context-btn equip" data-action="equip" data-item="${ui.selectedBankItem}">Equip</button>`;
      }
    }
    if (item.category === "food" && item.equipSlot === undefined) {
      // Food items are equippable in food slot but use equipSlot on the item def
      // Actually food items in our data DO have no equipSlot. We need to handle food equipping differently.
      // Food is equipped to the "food" slot. Let's check:
    }
    if (item.healAmount) {
      // Food: equipping just marks the type to eat (no bank movement — combat eats from bank)
      const isEquipped = state.equipment.food === ui.selectedBankItem;
      if (isEquipped) {
        html += `<button class="context-btn unequip" data-action="unequip-food">Unequip Food</button>`;
      } else {
        html += `<button class="context-btn equip" data-action="equip-food" data-item="${ui.selectedBankItem}">Equip as Food</button>`;
      }
    }

    // Sell button
    html += `<button class="context-btn sell" data-action="sell" data-item="${ui.selectedBankItem}">Sell for ${formatNumber(item.sellPrice)} GP</button>`;

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Event handlers
  container.querySelectorAll<HTMLElement>(".bank-item").forEach((el) => {
    el.addEventListener("click", () => selectBankItem(el.dataset.itemId!));
  });

  container.querySelectorAll<HTMLButtonElement>(".context-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "equip") {
        equip(state, btn.dataset.item!);
      } else if (action === "equip-food") {
        // Food equip just marks the type — no bank movement (combat eats from bank directly)
        state.equipment.food = btn.dataset.item!;
      } else if (action === "unequip-food") {
        state.equipment.food = null;
      } else if (action === "unequip") {
        unequip(state, btn.dataset.slot as EquipSlot);
      } else if (action === "sell") {
        sellItem(state, btn.dataset.item!, 1);
        if (!state.bank[btn.dataset.item!]) selectBankItem(null);
      }
    });
  });
}
