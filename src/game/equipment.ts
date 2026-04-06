import { GameState, EquipSlot, ItemId } from "./types";
import { getItem } from "../data/items";
import { addItem, removeItem } from "./bank";

export function equip(state: GameState, itemId: ItemId): boolean {
  const item = getItem(itemId);
  if (!item.equipSlot) return false;
  if (!removeItem(state, itemId, 1)) return false;

  // Unequip existing item in that slot
  const slot = item.equipSlot;
  const existing = state.equipment[slot];
  if (existing) {
    addItem(state, existing, 1);
  }

  state.equipment[slot] = itemId;
  return true;
}

export function unequip(state: GameState, slot: EquipSlot): boolean {
  const itemId = state.equipment[slot];
  if (!itemId) return false;
  state.equipment[slot] = null;
  addItem(state, itemId, 1);
  return true;
}

export interface EquippedStats {
  attackSpeed: number;
  strengthBonus: number;
  accuracyBonus: number;
  defenceBonus: number;
  hpBonus: number;
}

export function getEquippedStats(state: GameState): EquippedStats {
  const stats: EquippedStats = { attackSpeed: 3.0, strengthBonus: 0, accuracyBonus: 0, defenceBonus: 0, hpBonus: 0 };
  const slots: EquipSlot[] = ["weapon", "head", "body", "legs", "feet"];

  for (const slot of slots) {
    const itemId = state.equipment[slot];
    if (!itemId) continue;
    const item = getItem(itemId);
    if (item.attackSpeed !== undefined) stats.attackSpeed = item.attackSpeed;
    stats.strengthBonus += item.strengthBonus ?? 0;
    stats.accuracyBonus += item.accuracyBonus ?? 0;
    stats.defenceBonus += item.defenceBonus ?? 0;
    stats.hpBonus += item.hpBonus ?? 0;
  }

  return stats;
}
