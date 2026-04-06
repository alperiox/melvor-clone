import { GameState, EquipSlot } from "../game/types";
import { ITEMS, getItem } from "../data/items";
import { sellItem, getBankItemCount } from "../game/bank";
import { equip, unequip } from "../game/equipment";
import { formatNumber } from "../game/state";
import { getUIState, selectBankItem } from "./router";
import { showNotification } from "./notifications";

// Track what's rendered to avoid unnecessary rebuilds
let renderedBankSnapshot: string = "";

export function invalidateBankView(): void {
  renderedBankSnapshot = "";
}

export function renderBankView(state: GameState, container: HTMLElement): void {
  const ui = getUIState();

  // Build a lightweight snapshot of bank state for comparison
  const bankKeys = Object.entries(state.bank)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => `${id}:${qty}`)
    .join(",");
  const currentSnapshot = `${bankKeys}|${ui.selectedBankItem}|${ui.bankFilter}`;

  if (currentSnapshot !== renderedBankSnapshot) {
    buildBankDOM(state, container);
    renderedBankSnapshot = currentSnapshot;
  }
}

function buildBankDOM(state: GameState, container: HTMLElement): void {
  const ui = getUIState();
  const filter = ui.bankFilter;

  const bankEntries = Object.entries(state.bank)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty, def: ITEMS[id] }))
    .filter((e) => e.def !== undefined)
    .filter((e) => filter === "all" || e.def.category === filter)
    .sort((a, b) => {
      const catOrder: Record<string, number> = { resource: 0, food: 1, equipment: 2 };
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

  // Context panel
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

    // Equip/unequip for equipment
    if (item.equipSlot) {
      const isEquipped = state.equipment[item.equipSlot] === ui.selectedBankItem;
      if (isEquipped) {
        html += `<button class="context-btn unequip" data-action="unequip" data-slot="${item.equipSlot}">Unequip</button>`;
      } else {
        html += `<button class="context-btn equip" data-action="equip" data-item="${ui.selectedBankItem}">Equip</button>`;
      }
    }

    // Food equip (separate from regular equipment)
    if (item.healAmount) {
      const isEquipped = state.equipment.food === ui.selectedBankItem;
      if (isEquipped) {
        html += `<button class="context-btn unequip" data-action="unequip-food">Unequip Food</button>`;
      } else {
        html += `<button class="context-btn equip" data-action="equip-food" data-item="${ui.selectedBankItem}">Equip as Food</button>`;
      }
    }

    // Sell buttons with quantity options
    html += `<div class="sell-section">
      <div class="sell-label">Sell (${formatNumber(item.sellPrice)} GP each)</div>
      <div class="sell-buttons">
        <button class="sell-qty-btn" data-action="sell" data-item="${ui.selectedBankItem}" data-qty="1">1x</button>
        <button class="sell-qty-btn" data-action="sell" data-item="${ui.selectedBankItem}" data-qty="10">10x</button>
        <button class="sell-qty-btn" data-action="sell" data-item="${ui.selectedBankItem}" data-qty="100">100x</button>
        <button class="sell-qty-btn" data-action="sell" data-item="${ui.selectedBankItem}" data-qty="all">All</button>
      </div>
    </div>`;

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Event delegation
  container.onclick = (e: MouseEvent) => {
    // Item selection
    const bankItem = (e.target as HTMLElement).closest<HTMLElement>(".bank-item");
    if (bankItem?.dataset.itemId) {
      selectBankItem(bankItem.dataset.itemId);
      return;
    }

    // Context panel actions
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".context-btn, .sell-qty-btn");
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === "equip") {
      const itemId = btn.dataset.item!;
      equip(state, itemId);
      showNotification(`Equipped ${getItem(itemId).name}`, "info");
      invalidateBankView();
    } else if (action === "equip-food") {
      const itemId = btn.dataset.item!;
      state.equipment.food = itemId;
      showNotification(`Set ${getItem(itemId).name} as food`, "info");
      invalidateBankView();
    } else if (action === "unequip-food") {
      state.equipment.food = null;
      invalidateBankView();
    } else if (action === "unequip") {
      unequip(state, btn.dataset.slot as EquipSlot);
      invalidateBankView();
    } else if (action === "sell") {
      const itemId = btn.dataset.item!;
      const item = getItem(itemId);
      const qtyStr = btn.dataset.qty ?? "1";
      const owned = getBankItemCount(state, itemId);
      const qty = qtyStr === "all" ? owned : Math.min(parseInt(qtyStr, 10), owned);
      if (qty > 0) {
        sellItem(state, itemId, qty);
        const totalGold = item.sellPrice * qty;
        showNotification(`Sold ${qty} ${item.name} for ${formatNumber(totalGold)} GP`, "info");
        if (!state.bank[itemId]) selectBankItem(null);
      }
      invalidateBankView();
    }
  };
}
