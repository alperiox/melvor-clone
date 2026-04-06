import { MonsterDef, CombatAreaDef } from "../game/types";

export const MONSTERS: Record<string, MonsterDef> = {
  chicken: { id: "chicken", name: "Chicken", hp: 20, maxHit: 3, evasion: 10, attackSpeed: 3.0, goldDrop: [3, 8], lootTable: [{ itemId: "raw_shrimp", chance: 0.3, quantity: [1, 2] }] },
  cow: { id: "cow", name: "Cow", hp: 40, maxHit: 5, evasion: 15, attackSpeed: 3.2, goldDrop: [5, 12], lootTable: [{ itemId: "raw_shrimp", chance: 0.2, quantity: [1, 3] }] },
  goblin: { id: "goblin", name: "Goblin", hp: 60, maxHit: 8, evasion: 25, attackSpeed: 3.0, goldDrop: [8, 20], lootTable: [{ itemId: "copper_ore", chance: 0.3, quantity: [1, 3] }, { itemId: "bronze_dagger", chance: 0.03, quantity: [1, 1] }] },
  wolf: { id: "wolf", name: "Wolf", hp: 80, maxHit: 12, evasion: 40, attackSpeed: 2.8, goldDrop: [15, 30], lootTable: [{ itemId: "normal_log", chance: 0.25, quantity: [2, 5] }] },
  giant_spider: { id: "giant_spider", name: "Giant Spider", hp: 100, maxHit: 15, evasion: 50, attackSpeed: 3.0, goldDrop: [20, 40], lootTable: [{ itemId: "iron_ore", chance: 0.2, quantity: [1, 3] }] },
  bandit: { id: "bandit", name: "Bandit", hp: 130, maxHit: 18, evasion: 60, attackSpeed: 3.2, goldDrop: [25, 50], lootTable: [{ itemId: "iron_ore", chance: 0.25, quantity: [2, 4] }, { itemId: "iron_sword", chance: 0.03, quantity: [1, 1] }] },
  bat_swarm: { id: "bat_swarm", name: "Bat Swarm", hp: 150, maxHit: 20, evasion: 75, attackSpeed: 2.6, goldDrop: [30, 60], lootTable: [{ itemId: "coal", chance: 0.3, quantity: [2, 5] }] },
  skeleton: { id: "skeleton", name: "Skeleton", hp: 200, maxHit: 25, evasion: 90, attackSpeed: 3.0, goldDrop: [40, 80], lootTable: [{ itemId: "coal", chance: 0.25, quantity: [3, 6] }, { itemId: "steel_sword", chance: 0.02, quantity: [1, 1] }] },
  cave_troll: { id: "cave_troll", name: "Cave Troll", hp: 300, maxHit: 30, evasion: 100, attackSpeed: 3.6, goldDrop: [50, 100], lootTable: [{ itemId: "iron_ore", chance: 0.3, quantity: [5, 10] }, { itemId: "steel_platebody", chance: 0.02, quantity: [1, 1] }] },
  mountain_lion: { id: "mountain_lion", name: "Mountain Lion", hp: 350, maxHit: 35, evasion: 120, attackSpeed: 2.8, goldDrop: [60, 120], lootTable: [{ itemId: "raw_lobster", chance: 0.2, quantity: [2, 4] }] },
  orc_warrior: { id: "orc_warrior", name: "Orc Warrior", hp: 450, maxHit: 42, evasion: 140, attackSpeed: 3.2, goldDrop: [80, 160], lootTable: [{ itemId: "mithril_ore", chance: 0.15, quantity: [1, 3] }, { itemId: "mithril_sword", chance: 0.02, quantity: [1, 1] }] },
  rock_golem: { id: "rock_golem", name: "Rock Golem", hp: 600, maxHit: 50, evasion: 170, attackSpeed: 3.8, goldDrop: [100, 200], lootTable: [{ itemId: "mithril_ore", chance: 0.25, quantity: [3, 6] }, { itemId: "gold_ore", chance: 0.3, quantity: [3, 8] }] },
  shadow_knight: { id: "shadow_knight", name: "Shadow Knight", hp: 800, maxHit: 60, evasion: 200, attackSpeed: 3.0, goldDrop: [150, 300], lootTable: [{ itemId: "mithril_bar", chance: 0.2, quantity: [2, 4] }, { itemId: "shadow_blade", chance: 0.03, quantity: [1, 1] }] },
  demon: { id: "demon", name: "Demon", hp: 1000, maxHit: 75, evasion: 240, attackSpeed: 3.2, goldDrop: [200, 400], lootTable: [{ itemId: "mithril_bar", chance: 0.25, quantity: [3, 6] }, { itemId: "demon_plate", chance: 0.02, quantity: [1, 1] }] },
  dragon: { id: "dragon", name: "Dragon", hp: 1500, maxHit: 100, evasion: 300, attackSpeed: 3.6, goldDrop: [300, 500], lootTable: [{ itemId: "mithril_bar", chance: 0.3, quantity: [5, 10] }, { itemId: "dragon_shield_head", chance: 0.01, quantity: [1, 1] }] },
};

export const COMBAT_AREAS: CombatAreaDef[] = [
  { id: "grasslands", name: "Grasslands", levelReq: 1, monsterIds: ["chicken", "cow", "goblin"] },
  { id: "forest", name: "Forest", levelReq: 10, monsterIds: ["wolf", "giant_spider", "bandit"] },
  { id: "caves", name: "Caves", levelReq: 25, monsterIds: ["bat_swarm", "skeleton", "cave_troll"] },
  { id: "mountains", name: "Mountains", levelReq: 40, monsterIds: ["mountain_lion", "orc_warrior", "rock_golem"] },
  { id: "dark_dungeon", name: "Dark Dungeon", levelReq: 60, monsterIds: ["shadow_knight", "demon", "dragon"] },
];

export function getMonster(id: string): MonsterDef {
  const monster = MONSTERS[id];
  if (!monster) throw new Error(`Unknown monster: ${id}`);
  return monster;
}

export function getCombatArea(id: string): CombatAreaDef {
  const area = COMBAT_AREAS.find((a) => a.id === id);
  if (!area) throw new Error(`Unknown combat area: ${id}`);
  return area;
}
