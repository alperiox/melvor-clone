import { GameState, BuildingId, TownBonuses } from "./types";
import { getBuilding } from "../data/buildings";
import { removeItem, hasItems } from "./bank";

export function getTownBonuses(state: GameState): TownBonuses {
  const b = state.town.buildings;
  return {
    woodcuttingSpeed: b.lumber_mill * 0.05,
    miningSpeed: b.mine_shaft * 0.05,
    fishingSpeed: b.fishery * 0.05,
    smithingSpeed: b.forge * 0.05,
    cookingSuccessBonus: b.kitchen * 0.1,
    foodHealBonus: b.kitchen * 5,
    combatMaxHit: b.forge * 2,
    combatAccuracy: b.barracks * 3,
    combatMaxHp: b.barracks * 5,
    passiveGoldPerMinute: b.market * 2,
  };
}

export function getBuildingUpgradeCost(buildingId: BuildingId, currentLevel: number): { gold: number; items: Record<string, number> } {
  const def = getBuilding(buildingId);
  const nextLevel = currentLevel + 1;
  const multiplier = nextLevel * 1.5;

  const items: Record<string, number> = {};
  for (const [itemId, baseCost] of Object.entries(def.baseItemCosts)) {
    items[itemId] = Math.floor(baseCost * multiplier);
  }

  return {
    gold: Math.floor(def.baseGoldCost * multiplier),
    items,
  };
}

export function canAffordUpgrade(state: GameState, buildingId: BuildingId): boolean {
  const def = getBuilding(buildingId);
  const currentLevel = state.town.buildings[buildingId] ?? 0;
  if (currentLevel >= def.maxLevel) return false;

  const cost = getBuildingUpgradeCost(buildingId, currentLevel);
  if (state.gold < cost.gold) return false;
  if (!hasItems(state, cost.items)) return false;
  return true;
}

export function upgradeBuilding(state: GameState, buildingId: BuildingId): boolean {
  if (!canAffordUpgrade(state, buildingId)) return false;

  const currentLevel = state.town.buildings[buildingId] ?? 0;
  const cost = getBuildingUpgradeCost(buildingId, currentLevel);

  state.gold -= cost.gold;
  for (const [itemId, qty] of Object.entries(cost.items)) {
    removeItem(state, itemId, qty);
  }
  state.town.buildings[buildingId] = currentLevel + 1;
  return true;
}
