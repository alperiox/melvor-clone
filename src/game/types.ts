// === Skill IDs ===
export type SkillId = "woodcutting" | "mining" | "fishing" | "smithing" | "cooking" | "combat";

// === Item IDs ===
export type ItemId = string;

// === Equipment ===
export type EquipSlot = "weapon" | "head" | "body" | "legs" | "feet" | "food";

export interface EquipmentSlots {
  weapon: ItemId | null;
  head: ItemId | null;
  body: ItemId | null;
  legs: ItemId | null;
  feet: ItemId | null;
  food: ItemId | null;
}

// === Items ===
export type ItemCategory = "resource" | "food" | "equipment";

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  sellPrice: number;
  healAmount?: number;
  equipSlot?: EquipSlot;
  attackSpeed?: number;
  strengthBonus?: number;
  accuracyBonus?: number;
  defenceBonus?: number;
  hpBonus?: number;
}

// === Skills ===
export interface SkillActionDef {
  id: string;
  skillId: SkillId;
  name: string;
  levelReq: number;
  interval: number;
  xp: number;
  inputs: Record<ItemId, number>;
  outputs: Record<ItemId, number>;
  baseSuccessRate?: number;
}

// === Monsters ===
export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  maxHit: number;
  evasion: number;
  attackSpeed: number;
  goldDrop: [number, number];
  lootTable: LootDrop[];
}

export interface LootDrop {
  itemId: ItemId;
  chance: number;
  quantity: [number, number];
}

export interface CombatAreaDef {
  id: string;
  name: string;
  levelReq: number;
  monsterIds: string[];
}

// === Town ===
export type BuildingId = "lumber_mill" | "mine_shaft" | "fishery" | "forge" | "kitchen" | "barracks" | "market";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  maxLevel: number;
  baseItemCosts: Record<ItemId, number>;
  baseGoldCost: number;
  effectDescription: string;
}

// === Town Bonuses (computed) ===
export interface TownBonuses {
  woodcuttingSpeed: number;
  miningSpeed: number;
  fishingSpeed: number;
  smithingSpeed: number;
  cookingSuccessBonus: number;
  foodHealBonus: number;
  combatMaxHit: number;
  combatAccuracy: number;
  combatMaxHp: number;
  passiveGoldPerMinute: number;
}

// === Game State ===
export interface ActiveAction {
  type: "skill" | "combat";
  skillId?: SkillId;
  actionId?: string;
  areaId?: string;
  timer: number;
}

export interface CombatState {
  currentAreaId: string;
  currentMonsterIndex: number;
  playerHp: number;
  monsterHp: number;
  playerAttackTimer: number;
  monsterAttackTimer: number;
  respawnTimer: number;
}

export interface GameState {
  skills: Record<SkillId, { level: number; xp: number }>;
  bank: Record<ItemId, number>;
  equipment: EquipmentSlots;
  combat: CombatState | null;
  town: { buildings: Record<BuildingId, number> };
  activeAction: ActiveAction | null;
  gold: number;
  stats: {
    startedAt: number;
    lastSavedAt: number;
  };
}

// === Computed Player Stats ===
export interface PlayerStats {
  maxHp: number;
  attackSpeed: number;
  maxHit: number;
  minHit: number;
  accuracy: number;
  defence: number;
}
