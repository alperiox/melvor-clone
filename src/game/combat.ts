import { GameState, PlayerStats } from "./types";
import { getMonster, getCombatArea } from "../data/monsters";
import { getItem } from "../data/items";
import { getEquippedStats } from "./equipment";
import { getTownBonuses } from "./town";
import { addItem, getBankItemCount } from "./bank";
import { levelForXp } from "./xp";

const RESPAWN_TIME = 3;

export function getPlayerStats(state: GameState): PlayerStats {
  const equipped = getEquippedStats(state);
  const bonuses = getTownBonuses(state);
  const combatLevel = state.skills.combat.level;

  const maxHit = 1 + equipped.strengthBonus + bonuses.combatMaxHit;
  return {
    maxHp: 100 + combatLevel * 10 + equipped.hpBonus + bonuses.combatMaxHp,
    attackSpeed: equipped.attackSpeed,
    maxHit,
    minHit: Math.max(1, Math.floor(maxHit * 0.3)),
    accuracy: 50 + equipped.accuracyBonus + bonuses.combatAccuracy,
    defence: equipped.defenceBonus,
  };
}

export function calculateHitChance(accuracy: number, evasion: number): number {
  return accuracy / (accuracy + evasion);
}

export function startCombat(state: GameState, areaId: string): boolean {
  const area = getCombatArea(areaId);
  if (state.skills.combat.level < area.levelReq) return false;

  const firstMonster = getMonster(area.monsterIds[0]);
  state.combat = {
    currentAreaId: areaId,
    currentMonsterIndex: 0,
    playerHp: getPlayerStats(state).maxHp,
    monsterHp: firstMonster.hp,
    playerAttackTimer: 0,
    monsterAttackTimer: 0,
    respawnTimer: 0,
  };
  state.activeAction = { type: "combat", areaId, timer: 0 };
  return true;
}

export function stopCombat(state: GameState): void {
  state.combat = null;
  if (state.activeAction?.type === "combat") {
    state.activeAction = null;
  }
}

export interface LootResult {
  gold: number;
  items: { itemId: string; quantity: number }[];
}

export function rollLoot(monsterId: string): LootResult {
  const monster = getMonster(monsterId);
  const gold = monster.goldDrop[0] + Math.floor(Math.random() * (monster.goldDrop[1] - monster.goldDrop[0] + 1));
  const items: { itemId: string; quantity: number }[] = [];

  for (const drop of monster.lootTable) {
    if (Math.random() < drop.chance) {
      const qty = drop.quantity[0] + Math.floor(Math.random() * (drop.quantity[1] - drop.quantity[0] + 1));
      items.push({ itemId: drop.itemId, quantity: qty });
    }
  }

  return { gold, items };
}

export interface CombatTickResult {
  playerDamageDealt: number;
  monsterDamageDealt: number;
  monsterKilled: boolean;
  playerDied: boolean;
  loot: LootResult | null;
  xpGained: number;
  autoAteFood: boolean;
}

export function processCombatTick(state: GameState, dt: number): CombatTickResult {
  const result: CombatTickResult = {
    playerDamageDealt: 0, monsterDamageDealt: 0,
    monsterKilled: false, playerDied: false,
    loot: null, xpGained: 0, autoAteFood: false,
  };

  if (!state.combat || !state.activeAction || state.activeAction.type !== "combat") {
    return result;
  }

  const combat = state.combat;
  const area = getCombatArea(combat.currentAreaId);
  const monster = getMonster(area.monsterIds[combat.currentMonsterIndex]);
  const playerStats = getPlayerStats(state);

  // Handle respawn timer
  if (combat.respawnTimer > 0) {
    combat.respawnTimer -= dt;
    if (combat.respawnTimer <= 0) {
      combat.respawnTimer = 0;
      // Spawn next monster (cycle through area)
      combat.currentMonsterIndex = (combat.currentMonsterIndex + 1) % area.monsterIds.length;
      const nextMonster = getMonster(area.monsterIds[combat.currentMonsterIndex]);
      combat.monsterHp = nextMonster.hp;
      combat.playerAttackTimer = 0;
      combat.monsterAttackTimer = 0;
    }
    return result;
  }

  // Player attack timer
  combat.playerAttackTimer += dt;
  if (combat.playerAttackTimer >= playerStats.attackSpeed) {
    combat.playerAttackTimer -= playerStats.attackSpeed;
    const hitChance = calculateHitChance(playerStats.accuracy, monster.evasion);
    if (Math.random() < hitChance) {
      const damage = playerStats.minHit + Math.floor(Math.random() * (playerStats.maxHit - playerStats.minHit + 1));
      combat.monsterHp -= damage;
      result.playerDamageDealt = damage;
    }
  }

  // Check monster death
  if (combat.monsterHp <= 0) {
    result.monsterKilled = true;
    const loot = rollLoot(monster.id);
    result.loot = loot;
    state.gold += loot.gold;
    for (const item of loot.items) {
      addItem(state, item.itemId, item.quantity);
    }
    // Combat XP = monster hp / 4
    const xp = Math.floor(monster.hp / 4);
    state.skills.combat.xp += xp;
    result.xpGained = xp;
    const newLevel = levelForXp(state.skills.combat.xp);
    if (newLevel > state.skills.combat.level) {
      state.skills.combat.level = newLevel;
    }
    // Start respawn
    combat.respawnTimer = RESPAWN_TIME;
    combat.playerAttackTimer = 0;
    combat.monsterAttackTimer = 0;
    return result;
  }

  // Monster attack timer
  combat.monsterAttackTimer += dt;
  if (combat.monsterAttackTimer >= monster.attackSpeed) {
    combat.monsterAttackTimer -= monster.attackSpeed;
    let damage = 1 + Math.floor(Math.random() * monster.maxHit);
    damage = Math.max(1, damage - playerStats.defence);
    combat.playerHp -= damage;
    result.monsterDamageDealt = damage;
  }

  // Auto-eat: consume food when HP < 40% of max
  if (combat.playerHp < playerStats.maxHp * 0.4 && combat.playerHp > 0) {
    const foodId = state.equipment.food;
    if (foodId && getBankItemCount(state, foodId) > 0) {
      const foodItem = getItem(foodId);
      const healAmount = (foodItem.healAmount ?? 0) + getTownBonuses(state).foodHealBonus;
      state.bank[foodId]! -= 1;
      if (state.bank[foodId]! <= 0) delete state.bank[foodId];
      combat.playerHp = Math.min(playerStats.maxHp, combat.playerHp + healAmount);
      result.autoAteFood = true;
    }
  }

  // Check player death
  if (combat.playerHp <= 0) {
    result.playerDied = true;
    stopCombat(state);
    return result;
  }

  return result;
}
