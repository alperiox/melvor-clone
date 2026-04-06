import { BuildingDef } from "../game/types";

export const BUILDINGS: BuildingDef[] = [
  { id: "lumber_mill", name: "Lumber Mill", maxLevel: 10, baseItemCosts: { normal_log: 10 }, baseGoldCost: 50, effectDescription: "+5% Woodcutting speed per level" },
  { id: "mine_shaft", name: "Mine Shaft", maxLevel: 10, baseItemCosts: { copper_ore: 10 }, baseGoldCost: 50, effectDescription: "+5% Mining speed per level" },
  { id: "fishery", name: "Fishery", maxLevel: 10, baseItemCosts: { raw_shrimp: 10 }, baseGoldCost: 50, effectDescription: "+5% Fishing speed per level" },
  { id: "forge", name: "Forge", maxLevel: 10, baseItemCosts: { bronze_bar: 5 }, baseGoldCost: 100, effectDescription: "+5% Smithing speed, +2 max hit per level" },
  { id: "kitchen", name: "Kitchen", maxLevel: 10, baseItemCosts: { cooked_shrimp: 10 }, baseGoldCost: 75, effectDescription: "+10% cooking success, +5 food healing per level" },
  { id: "barracks", name: "Barracks", maxLevel: 10, baseItemCosts: {}, baseGoldCost: 300, effectDescription: "+3% accuracy, +5 max HP per level" },
  { id: "market", name: "Market", maxLevel: 10, baseItemCosts: {}, baseGoldCost: 500, effectDescription: "Generates 2 gold/min per level" },
];

export function getBuilding(id: string): BuildingDef {
  const b = BUILDINGS.find((b) => b.id === id);
  if (!b) throw new Error(`Unknown building: ${id}`);
  return b;
}
