import { GameState, ItemId } from "./types";
import { getItem } from "../data/items";

export function getBankItemCount(state: GameState, itemId: ItemId): number {
  return state.bank[itemId] ?? 0;
}

export function addItem(state: GameState, itemId: ItemId, quantity: number): void {
  state.bank[itemId] = (state.bank[itemId] ?? 0) + quantity;
}

export function removeItem(state: GameState, itemId: ItemId, quantity: number): boolean {
  const current = state.bank[itemId] ?? 0;
  if (current < quantity) return false;
  const remaining = current - quantity;
  if (remaining === 0) {
    delete state.bank[itemId];
  } else {
    state.bank[itemId] = remaining;
  }
  return true;
}

export function hasItems(state: GameState, items: Record<ItemId, number>): boolean {
  for (const [itemId, qty] of Object.entries(items)) {
    if ((state.bank[itemId] ?? 0) < qty) return false;
  }
  return true;
}

export function removeItems(state: GameState, items: Record<ItemId, number>): boolean {
  if (!hasItems(state, items)) return false;
  for (const [itemId, qty] of Object.entries(items)) {
    removeItem(state, itemId, qty);
  }
  return true;
}

export function sellItem(state: GameState, itemId: ItemId, quantity: number): boolean {
  const item = getItem(itemId);
  if (!removeItem(state, itemId, quantity)) return false;
  state.gold += item.sellPrice * quantity;
  return true;
}
