import { ItemDef } from "../game/types";

export const ITEMS: Record<string, ItemDef> = {
  // === Logs ===
  normal_log: { id: "normal_log", name: "Normal Log", category: "resource", sellPrice: 2 },
  oak_log: { id: "oak_log", name: "Oak Log", category: "resource", sellPrice: 5 },
  willow_log: { id: "willow_log", name: "Willow Log", category: "resource", sellPrice: 10 },
  maple_log: { id: "maple_log", name: "Maple Log", category: "resource", sellPrice: 20 },
  yew_log: { id: "yew_log", name: "Yew Log", category: "resource", sellPrice: 40 },
  // === Ore ===
  copper_ore: { id: "copper_ore", name: "Copper Ore", category: "resource", sellPrice: 2 },
  tin_ore: { id: "tin_ore", name: "Tin Ore", category: "resource", sellPrice: 2 },
  iron_ore: { id: "iron_ore", name: "Iron Ore", category: "resource", sellPrice: 8 },
  coal: { id: "coal", name: "Coal", category: "resource", sellPrice: 12 },
  gold_ore: { id: "gold_ore", name: "Gold Ore", category: "resource", sellPrice: 25 },
  mithril_ore: { id: "mithril_ore", name: "Mithril Ore", category: "resource", sellPrice: 40 },
  // === Raw Fish ===
  raw_shrimp: { id: "raw_shrimp", name: "Raw Shrimp", category: "resource", sellPrice: 2 },
  raw_trout: { id: "raw_trout", name: "Raw Trout", category: "resource", sellPrice: 6 },
  raw_salmon: { id: "raw_salmon", name: "Raw Salmon", category: "resource", sellPrice: 12 },
  raw_lobster: { id: "raw_lobster", name: "Raw Lobster", category: "resource", sellPrice: 20 },
  raw_swordfish: { id: "raw_swordfish", name: "Raw Swordfish", category: "resource", sellPrice: 35 },
  // === Bars ===
  bronze_bar: { id: "bronze_bar", name: "Bronze Bar", category: "resource", sellPrice: 6 },
  iron_bar: { id: "iron_bar", name: "Iron Bar", category: "resource", sellPrice: 20 },
  steel_bar: { id: "steel_bar", name: "Steel Bar", category: "resource", sellPrice: 35 },
  mithril_bar: { id: "mithril_bar", name: "Mithril Bar", category: "resource", sellPrice: 80 },
  // === Cooked Food ===
  cooked_shrimp: { id: "cooked_shrimp", name: "Cooked Shrimp", category: "food", sellPrice: 5, healAmount: 30 },
  cooked_trout: { id: "cooked_trout", name: "Cooked Trout", category: "food", sellPrice: 15, healAmount: 60 },
  cooked_salmon: { id: "cooked_salmon", name: "Cooked Salmon", category: "food", sellPrice: 30, healAmount: 100 },
  cooked_lobster: { id: "cooked_lobster", name: "Cooked Lobster", category: "food", sellPrice: 50, healAmount: 150 },
  cooked_swordfish: { id: "cooked_swordfish", name: "Cooked Swordfish", category: "food", sellPrice: 80, healAmount: 220 },
  // === Bronze Equipment ===
  bronze_dagger: { id: "bronze_dagger", name: "Bronze Dagger", category: "equipment", sellPrice: 10, equipSlot: "weapon", attackSpeed: 2.0, strengthBonus: 5, accuracyBonus: 8 },
  bronze_sword: { id: "bronze_sword", name: "Bronze Sword", category: "equipment", sellPrice: 15, equipSlot: "weapon", attackSpeed: 2.8, strengthBonus: 12, accuracyBonus: 15 },
  bronze_battleaxe: { id: "bronze_battleaxe", name: "Bronze Battleaxe", category: "equipment", sellPrice: 25, equipSlot: "weapon", attackSpeed: 3.6, strengthBonus: 22, accuracyBonus: 10 },
  bronze_helmet: { id: "bronze_helmet", name: "Bronze Helmet", category: "equipment", sellPrice: 10, equipSlot: "head", defenceBonus: 3, hpBonus: 0 },
  bronze_platebody: { id: "bronze_platebody", name: "Bronze Platebody", category: "equipment", sellPrice: 25, equipSlot: "body", defenceBonus: 8, hpBonus: 5 },
  bronze_platelegs: { id: "bronze_platelegs", name: "Bronze Platelegs", category: "equipment", sellPrice: 20, equipSlot: "legs", defenceBonus: 5, hpBonus: 0 },
  bronze_boots: { id: "bronze_boots", name: "Bronze Boots", category: "equipment", sellPrice: 10, equipSlot: "feet", defenceBonus: 2, hpBonus: 0 },
  // === Iron Equipment ===
  iron_dagger: { id: "iron_dagger", name: "Iron Dagger", category: "equipment", sellPrice: 20, equipSlot: "weapon", attackSpeed: 2.0, strengthBonus: 10, accuracyBonus: 15 },
  iron_sword: { id: "iron_sword", name: "Iron Sword", category: "equipment", sellPrice: 30, equipSlot: "weapon", attackSpeed: 2.8, strengthBonus: 22, accuracyBonus: 28 },
  iron_battleaxe: { id: "iron_battleaxe", name: "Iron Battleaxe", category: "equipment", sellPrice: 50, equipSlot: "weapon", attackSpeed: 3.6, strengthBonus: 40, accuracyBonus: 18 },
  iron_helmet: { id: "iron_helmet", name: "Iron Helmet", category: "equipment", sellPrice: 20, equipSlot: "head", defenceBonus: 6, hpBonus: 5 },
  iron_platebody: { id: "iron_platebody", name: "Iron Platebody", category: "equipment", sellPrice: 50, equipSlot: "body", defenceBonus: 15, hpBonus: 10 },
  iron_platelegs: { id: "iron_platelegs", name: "Iron Platelegs", category: "equipment", sellPrice: 40, equipSlot: "legs", defenceBonus: 10, hpBonus: 5 },
  iron_boots: { id: "iron_boots", name: "Iron Boots", category: "equipment", sellPrice: 20, equipSlot: "feet", defenceBonus: 4, hpBonus: 0 },
  // === Steel Equipment ===
  steel_dagger: { id: "steel_dagger", name: "Steel Dagger", category: "equipment", sellPrice: 40, equipSlot: "weapon", attackSpeed: 2.0, strengthBonus: 18, accuracyBonus: 25 },
  steel_sword: { id: "steel_sword", name: "Steel Sword", category: "equipment", sellPrice: 60, equipSlot: "weapon", attackSpeed: 2.8, strengthBonus: 38, accuracyBonus: 45 },
  steel_battleaxe: { id: "steel_battleaxe", name: "Steel Battleaxe", category: "equipment", sellPrice: 100, equipSlot: "weapon", attackSpeed: 3.6, strengthBonus: 65, accuracyBonus: 30 },
  steel_helmet: { id: "steel_helmet", name: "Steel Helmet", category: "equipment", sellPrice: 40, equipSlot: "head", defenceBonus: 10, hpBonus: 10 },
  steel_platebody: { id: "steel_platebody", name: "Steel Platebody", category: "equipment", sellPrice: 100, equipSlot: "body", defenceBonus: 25, hpBonus: 20 },
  steel_platelegs: { id: "steel_platelegs", name: "Steel Platelegs", category: "equipment", sellPrice: 80, equipSlot: "legs", defenceBonus: 18, hpBonus: 10 },
  steel_boots: { id: "steel_boots", name: "Steel Boots", category: "equipment", sellPrice: 40, equipSlot: "feet", defenceBonus: 7, hpBonus: 5 },
  // === Mithril Equipment ===
  mithril_dagger: { id: "mithril_dagger", name: "Mithril Dagger", category: "equipment", sellPrice: 80, equipSlot: "weapon", attackSpeed: 2.0, strengthBonus: 30, accuracyBonus: 40 },
  mithril_sword: { id: "mithril_sword", name: "Mithril Sword", category: "equipment", sellPrice: 120, equipSlot: "weapon", attackSpeed: 2.8, strengthBonus: 60, accuracyBonus: 70 },
  mithril_battleaxe: { id: "mithril_battleaxe", name: "Mithril Battleaxe", category: "equipment", sellPrice: 200, equipSlot: "weapon", attackSpeed: 3.6, strengthBonus: 100, accuracyBonus: 50 },
  mithril_helmet: { id: "mithril_helmet", name: "Mithril Helmet", category: "equipment", sellPrice: 80, equipSlot: "head", defenceBonus: 16, hpBonus: 15 },
  mithril_platebody: { id: "mithril_platebody", name: "Mithril Platebody", category: "equipment", sellPrice: 200, equipSlot: "body", defenceBonus: 40, hpBonus: 30 },
  mithril_platelegs: { id: "mithril_platelegs", name: "Mithril Platelegs", category: "equipment", sellPrice: 160, equipSlot: "legs", defenceBonus: 28, hpBonus: 20 },
  mithril_boots: { id: "mithril_boots", name: "Mithril Boots", category: "equipment", sellPrice: 80, equipSlot: "feet", defenceBonus: 12, hpBonus: 10 },
  // === Unique Dungeon Drops ===
  shadow_blade: { id: "shadow_blade", name: "Shadow Blade", category: "equipment", sellPrice: 500, equipSlot: "weapon", attackSpeed: 2.4, strengthBonus: 80, accuracyBonus: 85 },
  demon_plate: { id: "demon_plate", name: "Demon Platebody", category: "equipment", sellPrice: 800, equipSlot: "body", defenceBonus: 55, hpBonus: 40 },
  dragon_shield_head: { id: "dragon_shield_head", name: "Dragon Helmet", category: "equipment", sellPrice: 1000, equipSlot: "head", defenceBonus: 30, hpBonus: 50 },
};

export function getItem(id: string): ItemDef {
  const item = ITEMS[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}
