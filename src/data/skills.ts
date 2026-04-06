import { SkillActionDef } from "../game/types";

export const SKILL_ACTIONS: SkillActionDef[] = [
  // === Woodcutting ===
  { id: "cut_normal", skillId: "woodcutting", name: "Normal Tree", levelReq: 1, interval: 3, xp: 10, inputs: {}, outputs: { normal_log: 1 } },
  { id: "cut_oak", skillId: "woodcutting", name: "Oak Tree", levelReq: 10, interval: 3.5, xp: 25, inputs: {}, outputs: { oak_log: 1 } },
  { id: "cut_willow", skillId: "woodcutting", name: "Willow Tree", levelReq: 25, interval: 4, xp: 50, inputs: {}, outputs: { willow_log: 1 } },
  { id: "cut_maple", skillId: "woodcutting", name: "Maple Tree", levelReq: 40, interval: 4, xp: 80, inputs: {}, outputs: { maple_log: 1 } },
  { id: "cut_yew", skillId: "woodcutting", name: "Yew Tree", levelReq: 60, interval: 4.5, xp: 120, inputs: {}, outputs: { yew_log: 1 } },
  // === Mining ===
  { id: "mine_copper", skillId: "mining", name: "Copper Rock", levelReq: 1, interval: 3, xp: 10, inputs: {}, outputs: { copper_ore: 1 } },
  { id: "mine_tin", skillId: "mining", name: "Tin Rock", levelReq: 1, interval: 3, xp: 10, inputs: {}, outputs: { tin_ore: 1 } },
  { id: "mine_iron", skillId: "mining", name: "Iron Rock", levelReq: 15, interval: 3, xp: 30, inputs: {}, outputs: { iron_ore: 1 } },
  { id: "mine_coal", skillId: "mining", name: "Coal Rock", levelReq: 30, interval: 3, xp: 50, inputs: {}, outputs: { coal: 1 } },
  { id: "mine_gold", skillId: "mining", name: "Gold Rock", levelReq: 45, interval: 3, xp: 70, inputs: {}, outputs: { gold_ore: 1 } },
  { id: "mine_mithril", skillId: "mining", name: "Mithril Rock", levelReq: 60, interval: 3, xp: 100, inputs: {}, outputs: { mithril_ore: 1 } },
  // === Fishing ===
  { id: "fish_shrimp", skillId: "fishing", name: "Shrimp", levelReq: 1, interval: 3, xp: 10, inputs: {}, outputs: { raw_shrimp: 1 } },
  { id: "fish_trout", skillId: "fishing", name: "Trout", levelReq: 15, interval: 3.5, xp: 30, inputs: {}, outputs: { raw_trout: 1 } },
  { id: "fish_salmon", skillId: "fishing", name: "Salmon", levelReq: 30, interval: 4, xp: 50, inputs: {}, outputs: { raw_salmon: 1 } },
  { id: "fish_lobster", skillId: "fishing", name: "Lobster", levelReq: 45, interval: 4.5, xp: 80, inputs: {}, outputs: { raw_lobster: 1 } },
  { id: "fish_swordfish", skillId: "fishing", name: "Swordfish", levelReq: 60, interval: 5, xp: 120, inputs: {}, outputs: { raw_swordfish: 1 } },
  // === Smithing: Smelting ===
  { id: "smelt_bronze", skillId: "smithing", name: "Bronze Bar", levelReq: 1, interval: 3, xp: 15, inputs: { copper_ore: 1, tin_ore: 1 }, outputs: { bronze_bar: 1 } },
  { id: "smelt_iron", skillId: "smithing", name: "Iron Bar", levelReq: 15, interval: 3, xp: 35, inputs: { iron_ore: 1, coal: 1 }, outputs: { iron_bar: 1 } },
  { id: "smelt_steel", skillId: "smithing", name: "Steel Bar", levelReq: 30, interval: 3, xp: 60, inputs: { iron_ore: 1, coal: 2 }, outputs: { steel_bar: 1 } },
  { id: "smelt_mithril", skillId: "smithing", name: "Mithril Bar", levelReq: 60, interval: 3, xp: 110, inputs: { mithril_ore: 1, coal: 3 }, outputs: { mithril_bar: 1 } },
  // === Smithing: Forging (Bronze) ===
  { id: "forge_bronze_dagger", skillId: "smithing", name: "Bronze Dagger", levelReq: 1, interval: 3, xp: 15, inputs: { bronze_bar: 2 }, outputs: { bronze_dagger: 1 } },
  { id: "forge_bronze_sword", skillId: "smithing", name: "Bronze Sword", levelReq: 1, interval: 3, xp: 20, inputs: { bronze_bar: 3 }, outputs: { bronze_sword: 1 } },
  { id: "forge_bronze_battleaxe", skillId: "smithing", name: "Bronze Battleaxe", levelReq: 5, interval: 3, xp: 30, inputs: { bronze_bar: 5 }, outputs: { bronze_battleaxe: 1 } },
  { id: "forge_bronze_helmet", skillId: "smithing", name: "Bronze Helmet", levelReq: 1, interval: 3, xp: 15, inputs: { bronze_bar: 2 }, outputs: { bronze_helmet: 1 } },
  { id: "forge_bronze_platebody", skillId: "smithing", name: "Bronze Platebody", levelReq: 5, interval: 3, xp: 30, inputs: { bronze_bar: 5 }, outputs: { bronze_platebody: 1 } },
  { id: "forge_bronze_platelegs", skillId: "smithing", name: "Bronze Platelegs", levelReq: 3, interval: 3, xp: 25, inputs: { bronze_bar: 4 }, outputs: { bronze_platelegs: 1 } },
  { id: "forge_bronze_boots", skillId: "smithing", name: "Bronze Boots", levelReq: 1, interval: 3, xp: 15, inputs: { bronze_bar: 2 }, outputs: { bronze_boots: 1 } },
  // === Smithing: Forging (Iron) ===
  { id: "forge_iron_dagger", skillId: "smithing", name: "Iron Dagger", levelReq: 15, interval: 3, xp: 30, inputs: { iron_bar: 2 }, outputs: { iron_dagger: 1 } },
  { id: "forge_iron_sword", skillId: "smithing", name: "Iron Sword", levelReq: 15, interval: 3, xp: 40, inputs: { iron_bar: 3 }, outputs: { iron_sword: 1 } },
  { id: "forge_iron_battleaxe", skillId: "smithing", name: "Iron Battleaxe", levelReq: 20, interval: 3, xp: 55, inputs: { iron_bar: 5 }, outputs: { iron_battleaxe: 1 } },
  { id: "forge_iron_helmet", skillId: "smithing", name: "Iron Helmet", levelReq: 15, interval: 3, xp: 30, inputs: { iron_bar: 2 }, outputs: { iron_helmet: 1 } },
  { id: "forge_iron_platebody", skillId: "smithing", name: "Iron Platebody", levelReq: 20, interval: 3, xp: 55, inputs: { iron_bar: 5 }, outputs: { iron_platebody: 1 } },
  { id: "forge_iron_platelegs", skillId: "smithing", name: "Iron Platelegs", levelReq: 18, interval: 3, xp: 45, inputs: { iron_bar: 4 }, outputs: { iron_platelegs: 1 } },
  { id: "forge_iron_boots", skillId: "smithing", name: "Iron Boots", levelReq: 15, interval: 3, xp: 30, inputs: { iron_bar: 2 }, outputs: { iron_boots: 1 } },
  // === Smithing: Forging (Steel) ===
  { id: "forge_steel_dagger", skillId: "smithing", name: "Steel Dagger", levelReq: 30, interval: 3, xp: 55, inputs: { steel_bar: 2 }, outputs: { steel_dagger: 1 } },
  { id: "forge_steel_sword", skillId: "smithing", name: "Steel Sword", levelReq: 30, interval: 3, xp: 70, inputs: { steel_bar: 3 }, outputs: { steel_sword: 1 } },
  { id: "forge_steel_battleaxe", skillId: "smithing", name: "Steel Battleaxe", levelReq: 35, interval: 3, xp: 95, inputs: { steel_bar: 5 }, outputs: { steel_battleaxe: 1 } },
  { id: "forge_steel_helmet", skillId: "smithing", name: "Steel Helmet", levelReq: 30, interval: 3, xp: 55, inputs: { steel_bar: 2 }, outputs: { steel_helmet: 1 } },
  { id: "forge_steel_platebody", skillId: "smithing", name: "Steel Platebody", levelReq: 35, interval: 3, xp: 95, inputs: { steel_bar: 5 }, outputs: { steel_platebody: 1 } },
  { id: "forge_steel_platelegs", skillId: "smithing", name: "Steel Platelegs", levelReq: 33, interval: 3, xp: 80, inputs: { steel_bar: 4 }, outputs: { steel_platelegs: 1 } },
  { id: "forge_steel_boots", skillId: "smithing", name: "Steel Boots", levelReq: 30, interval: 3, xp: 55, inputs: { steel_bar: 2 }, outputs: { steel_boots: 1 } },
  // === Smithing: Forging (Mithril) ===
  { id: "forge_mithril_dagger", skillId: "smithing", name: "Mithril Dagger", levelReq: 60, interval: 3, xp: 100, inputs: { mithril_bar: 3 }, outputs: { mithril_dagger: 1 } },
  { id: "forge_mithril_sword", skillId: "smithing", name: "Mithril Sword", levelReq: 60, interval: 3, xp: 130, inputs: { mithril_bar: 4 }, outputs: { mithril_sword: 1 } },
  { id: "forge_mithril_battleaxe", skillId: "smithing", name: "Mithril Battleaxe", levelReq: 65, interval: 3, xp: 170, inputs: { mithril_bar: 6 }, outputs: { mithril_battleaxe: 1 } },
  { id: "forge_mithril_helmet", skillId: "smithing", name: "Mithril Helmet", levelReq: 60, interval: 3, xp: 100, inputs: { mithril_bar: 3 }, outputs: { mithril_helmet: 1 } },
  { id: "forge_mithril_platebody", skillId: "smithing", name: "Mithril Platebody", levelReq: 65, interval: 3, xp: 170, inputs: { mithril_bar: 6 }, outputs: { mithril_platebody: 1 } },
  { id: "forge_mithril_platelegs", skillId: "smithing", name: "Mithril Platelegs", levelReq: 63, interval: 3, xp: 145, inputs: { mithril_bar: 5 }, outputs: { mithril_platelegs: 1 } },
  { id: "forge_mithril_boots", skillId: "smithing", name: "Mithril Boots", levelReq: 60, interval: 3, xp: 100, inputs: { mithril_bar: 3 }, outputs: { mithril_boots: 1 } },
  // === Cooking ===
  { id: "cook_shrimp", skillId: "cooking", name: "Cooked Shrimp", levelReq: 1, interval: 3, xp: 15, inputs: { raw_shrimp: 1 }, outputs: { cooked_shrimp: 1 }, baseSuccessRate: 0.7 },
  { id: "cook_trout", skillId: "cooking", name: "Cooked Trout", levelReq: 15, interval: 3, xp: 35, inputs: { raw_trout: 1 }, outputs: { cooked_trout: 1 }, baseSuccessRate: 0.65 },
  { id: "cook_salmon", skillId: "cooking", name: "Cooked Salmon", levelReq: 30, interval: 3, xp: 55, inputs: { raw_salmon: 1 }, outputs: { cooked_salmon: 1 }, baseSuccessRate: 0.6 },
  { id: "cook_lobster", skillId: "cooking", name: "Cooked Lobster", levelReq: 45, interval: 3, xp: 80, inputs: { raw_lobster: 1 }, outputs: { cooked_lobster: 1 }, baseSuccessRate: 0.55 },
  { id: "cook_swordfish", skillId: "cooking", name: "Cooked Swordfish", levelReq: 60, interval: 3, xp: 120, inputs: { raw_swordfish: 1 }, outputs: { cooked_swordfish: 1 }, baseSuccessRate: 0.5 },
];

export function getSkillActions(skillId: string): SkillActionDef[] {
  return SKILL_ACTIONS.filter((a) => a.skillId === skillId);
}

export function getSkillAction(actionId: string): SkillActionDef {
  const action = SKILL_ACTIONS.find((a) => a.id === actionId);
  if (!action) throw new Error(`Unknown skill action: ${actionId}`);
  return action;
}
