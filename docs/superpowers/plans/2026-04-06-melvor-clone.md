# Melvor Idle Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Melvor Idle clone with 5 skills (Woodcutting, Mining, Fishing, Smithing, Cooking), auto-attack combat with 5 areas, a town building system, and bank/equipment management.

**Architecture:** All game logic runs in TypeScript (vanilla DOM, no framework). Rust backend handles only save/load persistence via Tauri IPC. The game loop uses `requestAnimationFrame` with delta-time tracking. Tab-based UI with persistent footer showing active action.

**Tech Stack:** Tauri v2, TypeScript, Vite, Vitest (unit tests), vanilla DOM

**Spec:** `docs/superpowers/specs/2026-04-06-melvor-clone-design.md`

---

## File Structure

```
src/
  main.ts                  — Entry point, wires all systems together
  styles.css               — All game styles
  data/
    items.ts               — Item definitions (resources, food, equipment) with stats and sell prices
    skills.ts              — Skill action definitions (gathering + artisan recipes)
    monsters.ts            — Monster definitions, area definitions, loot tables
    buildings.ts           — Town building definitions with costs and effects
  game/
    types.ts               — All shared type definitions (SkillId, ItemId, EquipSlot, etc.)
    state.ts               — GameState interface, createInitialState()
    xp.ts                  — XP curve: xpForLevel(), levelForXp(), xpToNextLevel()
    bank.ts                — addItem(), removeItem(), hasItems(), sellItem()
    equipment.ts           — equip(), unequip(), getEquippedStats()
    skills.ts              — processSkillTick(), startSkillAction(), getEffectiveInterval()
    combat.ts              — processCombatTick(), startCombat(), stopCombat(), rollLoot()
    town.ts                — getTownBonuses(), upgradeBuilding(), canAffordUpgrade()
    engine.ts              — GameEngine class (tick loop, dispatches to subsystems)
    offline.ts             — calculateOfflineProgress()
    storage.ts             — save/load via Tauri IPC (updated for new GameState)
  ui/
    router.ts              — Tab/sub-tab state, switchTab(), switchSubTab()
    nav.ts                 — Top nav bar rendering (tabs + gold)
    footer.ts              — Persistent footer (active action + progress bar)
    skills-view.ts         — Skills tab: sub-tabs, action grid, progress bar
    combat-view.ts         — Combat tab: area selection, monster fight, loot log
    town-view.ts           — Town tab: building cards with upgrade buttons
    bank-view.ts           — Bank tab: item grid, context panel, equip/sell
  index.html               — HTML shell with tab-based layout structure
  tests/
    xp.test.ts             — XP curve tests
    bank.test.ts           — Bank & equipment tests
    town.test.ts           — Town bonus & upgrade tests
    skills.test.ts         — Skill processing tests
    combat.test.ts         — Combat calc tests
```

---

### Task 1: Project Setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Verify setup**

Run: `npx vitest run`
Expected: "No test files found" (no tests yet — this confirms vitest is configured)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit testing"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: Write all type definitions**

Create `src/game/types.ts`:

```typescript
// === Skill IDs ===
export type SkillId = "woodcutting" | "mining" | "fishing" | "smithing" | "cooking" | "combat";

// === Item IDs ===
export type ItemId = string; // e.g., "normal_log", "bronze_sword"

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
  // Food-specific
  healAmount?: number;
  // Equipment-specific
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
  interval: number; // seconds
  xp: number;
  inputs: Record<ItemId, number>; // items consumed per action
  outputs: Record<ItemId, number>; // items produced per action
  baseSuccessRate?: number; // 0-1, for cooking. undefined = always succeeds
}

// === Monsters ===
export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  maxHit: number;
  evasion: number;
  attackSpeed: number; // seconds
  goldDrop: [number, number]; // [min, max]
  lootTable: LootDrop[];
}

export interface LootDrop {
  itemId: ItemId;
  chance: number; // 0-1
  quantity: [number, number]; // [min, max]
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
  baseItemCosts: Record<ItemId, number>; // base item cost (multiplied by level * 1.5)
  baseGoldCost: number; // base gold cost (multiplied by level * 1.5)
  effectDescription: string; // e.g., "+5% Woodcutting speed per level"
}

// === Town Bonuses (computed) ===
export interface TownBonuses {
  woodcuttingSpeed: number; // multiplier, e.g., 0.15 = 15% faster
  miningSpeed: number;
  fishingSpeed: number;
  smithingSpeed: number;
  cookingSuccessBonus: number; // flat addition to success rate, e.g., 0.3 = +30%
  foodHealBonus: number; // flat HP added per food consumed
  combatMaxHit: number; // flat addition to max hit
  combatAccuracy: number; // flat addition to accuracy
  combatMaxHp: number; // flat addition to max HP
  passiveGoldPerMinute: number; // gold earned per minute from Market
}

// === Game State ===
export interface ActiveAction {
  type: "skill" | "combat";
  skillId?: SkillId;
  actionId?: string;
  areaId?: string;
  timer: number; // seconds elapsed in current action cycle
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors (types are self-contained, no imports from other new files)

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat: add core type definitions for all game systems"
```

---

### Task 3: Game Data

**Files:**
- Create: `src/data/items.ts`
- Create: `src/data/skills.ts`
- Create: `src/data/monsters.ts`
- Create: `src/data/buildings.ts`

- [ ] **Step 1: Create items data**

Create `src/data/items.ts`:

```typescript
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
```

- [ ] **Step 2: Create skills data**

Create `src/data/skills.ts`:

```typescript
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
```

- [ ] **Step 3: Create monsters data**

Create `src/data/monsters.ts`:

```typescript
import { MonsterDef, CombatAreaDef } from "../game/types";

export const MONSTERS: Record<string, MonsterDef> = {
  chicken: { id: "chicken", name: "Chicken", hp: 20, maxHit: 3, evasion: 10, attackSpeed: 3.0, goldDrop: [3, 8], lootTable: [
    { itemId: "raw_shrimp", chance: 0.3, quantity: [1, 2] },
  ]},
  cow: { id: "cow", name: "Cow", hp: 40, maxHit: 5, evasion: 15, attackSpeed: 3.2, goldDrop: [5, 12], lootTable: [
    { itemId: "raw_shrimp", chance: 0.2, quantity: [1, 3] },
  ]},
  goblin: { id: "goblin", name: "Goblin", hp: 60, maxHit: 8, evasion: 25, attackSpeed: 3.0, goldDrop: [8, 20], lootTable: [
    { itemId: "copper_ore", chance: 0.3, quantity: [1, 3] },
    { itemId: "bronze_dagger", chance: 0.03, quantity: [1, 1] },
  ]},

  wolf: { id: "wolf", name: "Wolf", hp: 80, maxHit: 12, evasion: 40, attackSpeed: 2.8, goldDrop: [15, 30], lootTable: [
    { itemId: "normal_log", chance: 0.25, quantity: [2, 5] },
  ]},
  giant_spider: { id: "giant_spider", name: "Giant Spider", hp: 100, maxHit: 15, evasion: 50, attackSpeed: 3.0, goldDrop: [20, 40], lootTable: [
    { itemId: "iron_ore", chance: 0.2, quantity: [1, 3] },
  ]},
  bandit: { id: "bandit", name: "Bandit", hp: 130, maxHit: 18, evasion: 60, attackSpeed: 3.2, goldDrop: [25, 50], lootTable: [
    { itemId: "iron_ore", chance: 0.25, quantity: [2, 4] },
    { itemId: "iron_sword", chance: 0.03, quantity: [1, 1] },
  ]},

  bat_swarm: { id: "bat_swarm", name: "Bat Swarm", hp: 150, maxHit: 20, evasion: 75, attackSpeed: 2.6, goldDrop: [30, 60], lootTable: [
    { itemId: "coal", chance: 0.3, quantity: [2, 5] },
  ]},
  skeleton: { id: "skeleton", name: "Skeleton", hp: 200, maxHit: 25, evasion: 90, attackSpeed: 3.0, goldDrop: [40, 80], lootTable: [
    { itemId: "coal", chance: 0.25, quantity: [3, 6] },
    { itemId: "steel_sword", chance: 0.02, quantity: [1, 1] },
  ]},
  cave_troll: { id: "cave_troll", name: "Cave Troll", hp: 300, maxHit: 30, evasion: 100, attackSpeed: 3.6, goldDrop: [50, 100], lootTable: [
    { itemId: "iron_ore", chance: 0.3, quantity: [5, 10] },
    { itemId: "steel_platebody", chance: 0.02, quantity: [1, 1] },
  ]},

  mountain_lion: { id: "mountain_lion", name: "Mountain Lion", hp: 350, maxHit: 35, evasion: 120, attackSpeed: 2.8, goldDrop: [60, 120], lootTable: [
    { itemId: "raw_lobster", chance: 0.2, quantity: [2, 4] },
  ]},
  orc_warrior: { id: "orc_warrior", name: "Orc Warrior", hp: 450, maxHit: 42, evasion: 140, attackSpeed: 3.2, goldDrop: [80, 160], lootTable: [
    { itemId: "mithril_ore", chance: 0.15, quantity: [1, 3] },
    { itemId: "mithril_sword", chance: 0.02, quantity: [1, 1] },
  ]},
  rock_golem: { id: "rock_golem", name: "Rock Golem", hp: 600, maxHit: 50, evasion: 170, attackSpeed: 3.8, goldDrop: [100, 200], lootTable: [
    { itemId: "mithril_ore", chance: 0.25, quantity: [3, 6] },
    { itemId: "gold_ore", chance: 0.3, quantity: [3, 8] },
  ]},

  shadow_knight: { id: "shadow_knight", name: "Shadow Knight", hp: 800, maxHit: 60, evasion: 200, attackSpeed: 3.0, goldDrop: [150, 300], lootTable: [
    { itemId: "mithril_bar", chance: 0.2, quantity: [2, 4] },
    { itemId: "shadow_blade", chance: 0.03, quantity: [1, 1] },
  ]},
  demon: { id: "demon", name: "Demon", hp: 1000, maxHit: 75, evasion: 240, attackSpeed: 3.2, goldDrop: [200, 400], lootTable: [
    { itemId: "mithril_bar", chance: 0.25, quantity: [3, 6] },
    { itemId: "demon_plate", chance: 0.02, quantity: [1, 1] },
  ]},
  dragon: { id: "dragon", name: "Dragon", hp: 1500, maxHit: 100, evasion: 300, attackSpeed: 3.6, goldDrop: [300, 500], lootTable: [
    { itemId: "mithril_bar", chance: 0.3, quantity: [5, 10] },
    { itemId: "dragon_shield_head", chance: 0.01, quantity: [1, 1] },
  ]},
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
```

- [ ] **Step 4: Create buildings data**

Create `src/data/buildings.ts`:

```typescript
import { BuildingDef } from "../game/types";

export const BUILDINGS: BuildingDef[] = [
  {
    id: "lumber_mill", name: "Lumber Mill", maxLevel: 10,
    baseItemCosts: { normal_log: 10 }, baseGoldCost: 50,
    effectDescription: "+5% Woodcutting speed per level",
  },
  {
    id: "mine_shaft", name: "Mine Shaft", maxLevel: 10,
    baseItemCosts: { copper_ore: 10 }, baseGoldCost: 50,
    effectDescription: "+5% Mining speed per level",
  },
  {
    id: "fishery", name: "Fishery", maxLevel: 10,
    baseItemCosts: { raw_shrimp: 10 }, baseGoldCost: 50,
    effectDescription: "+5% Fishing speed per level",
  },
  {
    id: "forge", name: "Forge", maxLevel: 10,
    baseItemCosts: { bronze_bar: 5 }, baseGoldCost: 100,
    effectDescription: "+5% Smithing speed, +2 max hit per level",
  },
  {
    id: "kitchen", name: "Kitchen", maxLevel: 10,
    baseItemCosts: { cooked_shrimp: 10 }, baseGoldCost: 75,
    effectDescription: "+10% cooking success, +5 food healing per level",
  },
  {
    id: "barracks", name: "Barracks", maxLevel: 10,
    baseItemCosts: {}, baseGoldCost: 300,
    effectDescription: "+3% accuracy, +5 max HP per level",
  },
  {
    id: "market", name: "Market", maxLevel: 10,
    baseItemCosts: {}, baseGoldCost: 500,
    effectDescription: "Generates 2 gold/min per level",
  },
];

export function getBuilding(id: string): BuildingDef {
  const b = BUILDINGS.find((b) => b.id === id);
  if (!b) throw new Error(`Unknown building: ${id}`);
  return b;
}
```

- [ ] **Step 5: Verify data compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/data/
git commit -m "feat: add game data definitions (items, skills, monsters, buildings)"
```

---

### Task 4: XP System (TDD)

**Files:**
- Create: `src/game/xp.ts`
- Create: `src/tests/xp.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/xp.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { xpForLevel, levelForXp, xpToNextLevel } from "../game/xp";

describe("xpForLevel", () => {
  it("returns 0 for level 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("returns correct XP for level 2", () => {
    expect(xpForLevel(2)).toBeGreaterThan(0);
  });

  it("increases monotonically", () => {
    for (let i = 2; i <= 99; i++) {
      expect(xpForLevel(i)).toBeGreaterThan(xpForLevel(i - 1));
    }
  });

  it("roughly doubles every 7 levels", () => {
    const xp10 = xpForLevel(10) - xpForLevel(9);
    const xp17 = xpForLevel(17) - xpForLevel(16);
    const ratio = xp17 / xp10;
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2.5);
  });
});

describe("levelForXp", () => {
  it("returns 1 for 0 XP", () => {
    expect(levelForXp(0)).toBe(1);
  });

  it("returns correct level at exact boundaries", () => {
    const xpAt10 = xpForLevel(10);
    expect(levelForXp(xpAt10)).toBe(10);
    expect(levelForXp(xpAt10 - 1)).toBe(9);
  });

  it("caps at 99", () => {
    expect(levelForXp(999_999_999)).toBe(99);
  });
});

describe("xpToNextLevel", () => {
  it("returns XP needed from current XP to next level", () => {
    const result = xpToNextLevel(1, 0);
    expect(result).toBe(xpForLevel(2));
  });

  it("returns 0 at max level", () => {
    expect(xpToNextLevel(99, 999_999_999)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/xp.test.ts`
Expected: FAIL — module `../game/xp` not found

- [ ] **Step 3: Implement XP system**

Create `src/game/xp.ts`:

```typescript
const MAX_LEVEL = 99;

// XP table: cumulative XP required for each level (precomputed)
const XP_TABLE: number[] = [0]; // index 0 = unused, index 1 = 0 XP

function buildXpTable(): void {
  let total = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    const diff = Math.floor(0.25 * (level + 300 * Math.pow(2, level / 7)));
    total += diff;
    XP_TABLE.push(total); // XP_TABLE[level+1] = total XP for level+1
  }
}
buildXpTable();

/** Total cumulative XP required to reach a given level. Level 1 = 0. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return XP_TABLE[MAX_LEVEL] ?? 0;
  return XP_TABLE[level] ?? 0;
}

/** Given cumulative XP, return the current level (1-99). */
export function levelForXp(xp: number): number {
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (xp >= xpForLevel(level)) return level;
  }
  return 1;
}

/** XP remaining from current XP to reach the next level. Returns 0 at max. */
export function xpToNextLevel(level: number, currentXp: number): number {
  if (level >= MAX_LEVEL) return 0;
  return xpForLevel(level + 1) - currentXp;
}

/** XP progress fraction (0-1) within the current level. */
export function xpProgress(level: number, currentXp: number): number {
  if (level >= MAX_LEVEL) return 1;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const range = next - current;
  if (range <= 0) return 1;
  return (currentXp - current) / range;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/xp.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/xp.ts src/tests/xp.test.ts
git commit -m "feat: add XP curve system with tests"
```

---

### Task 5: Game State & Bank (TDD)

**Files:**
- Create: `src/game/state.ts` (replace existing)
- Create: `src/game/bank.ts`
- Create: `src/game/equipment.ts`
- Create: `src/tests/bank.test.ts`

- [ ] **Step 1: Replace game state**

Replace `src/game/state.ts` entirely:

```typescript
import { GameState, SkillId, BuildingId } from "./types";

const ALL_SKILLS: SkillId[] = ["woodcutting", "mining", "fishing", "smithing", "cooking", "combat"];
const ALL_BUILDINGS: BuildingId[] = ["lumber_mill", "mine_shaft", "fishery", "forge", "kitchen", "barracks", "market"];

export function createInitialState(): GameState {
  const skills: GameState["skills"] = {} as GameState["skills"];
  for (const s of ALL_SKILLS) {
    skills[s] = { level: 1, xp: 0 };
  }

  const buildings: GameState["town"]["buildings"] = {} as GameState["town"]["buildings"];
  for (const b of ALL_BUILDINGS) {
    buildings[b] = 0;
  }

  return {
    skills,
    bank: {},
    equipment: { weapon: null, head: null, body: null, legs: null, feet: null, food: null },
    combat: null,
    town: { buildings },
    activeAction: null,
    gold: 0,
    stats: {
      startedAt: Date.now(),
      lastSavedAt: Date.now(),
    },
  };
}

export function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1) + "M";
  return (n / 1_000_000_000).toFixed(1) + "B";
}
```

- [ ] **Step 2: Write failing bank/equipment tests**

Create `src/tests/bank.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { addItem, removeItem, hasItems, sellItem, getBankItemCount } from "../game/bank";
import { equip, unequip, getEquippedStats } from "../game/equipment";
import { createInitialState } from "../game/state";

describe("bank", () => {
  it("addItem increases quantity", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    expect(getBankItemCount(state, "copper_ore")).toBe(5);
  });

  it("addItem stacks on existing", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    addItem(state, "copper_ore", 3);
    expect(getBankItemCount(state, "copper_ore")).toBe(8);
  });

  it("removeItem decreases quantity", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    const success = removeItem(state, "copper_ore", 3);
    expect(success).toBe(true);
    expect(getBankItemCount(state, "copper_ore")).toBe(2);
  });

  it("removeItem fails if not enough", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 2);
    const success = removeItem(state, "copper_ore", 5);
    expect(success).toBe(false);
    expect(getBankItemCount(state, "copper_ore")).toBe(2);
  });

  it("removeItem cleans up zero entries", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 3);
    removeItem(state, "copper_ore", 3);
    expect(state.bank["copper_ore"]).toBeUndefined();
  });

  it("hasItems checks multiple items", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 5);
    addItem(state, "tin_ore", 3);
    expect(hasItems(state, { copper_ore: 5, tin_ore: 3 })).toBe(true);
    expect(hasItems(state, { copper_ore: 5, tin_ore: 4 })).toBe(false);
  });

  it("sellItem adds gold and removes item", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 10);
    sellItem(state, "copper_ore", 5);
    expect(getBankItemCount(state, "copper_ore")).toBe(5);
    expect(state.gold).toBe(10); // copper_ore sellPrice = 2, 5 * 2 = 10
  });
});

describe("equipment", () => {
  it("equip moves item from bank to slot", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    equip(state, "bronze_sword");
    expect(state.equipment.weapon).toBe("bronze_sword");
    expect(getBankItemCount(state, "bronze_sword")).toBe(0);
  });

  it("equip swaps existing equipment back to bank", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    addItem(state, "iron_sword", 1);
    equip(state, "bronze_sword");
    equip(state, "iron_sword");
    expect(state.equipment.weapon).toBe("iron_sword");
    expect(getBankItemCount(state, "bronze_sword")).toBe(1);
    expect(getBankItemCount(state, "iron_sword")).toBe(0);
  });

  it("unequip returns item to bank", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    equip(state, "bronze_sword");
    unequip(state, "weapon");
    expect(state.equipment.weapon).toBeNull();
    expect(getBankItemCount(state, "bronze_sword")).toBe(1);
  });

  it("getEquippedStats sums all equipment bonuses", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    addItem(state, "bronze_platebody", 1);
    equip(state, "bronze_sword");
    equip(state, "bronze_platebody");
    const stats = getEquippedStats(state);
    expect(stats.strengthBonus).toBe(12);    // bronze sword
    expect(stats.accuracyBonus).toBe(15);    // bronze sword
    expect(stats.defenceBonus).toBe(8);      // bronze platebody
    expect(stats.hpBonus).toBe(5);           // bronze platebody
    expect(stats.attackSpeed).toBe(2.8);     // bronze sword
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/tests/bank.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 4: Implement bank module**

Create `src/game/bank.ts`:

```typescript
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
```

- [ ] **Step 5: Implement equipment module**

Create `src/game/equipment.ts`:

```typescript
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/tests/bank.test.ts`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/state.ts src/game/bank.ts src/game/equipment.ts src/tests/bank.test.ts
git commit -m "feat: add bank and equipment systems with tests"
```

---

### Task 6: Town System (TDD)

**Files:**
- Create: `src/game/town.ts`
- Create: `src/tests/town.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/town.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getTownBonuses, canAffordUpgrade, upgradeBuilding, getBuildingUpgradeCost } from "../game/town";
import { createInitialState } from "../game/state";
import { addItem } from "../game/bank";

describe("getTownBonuses", () => {
  it("returns zeros for no buildings", () => {
    const state = createInitialState();
    const bonuses = getTownBonuses(state);
    expect(bonuses.woodcuttingSpeed).toBe(0);
    expect(bonuses.passiveGoldPerMinute).toBe(0);
  });

  it("returns correct bonuses for upgraded buildings", () => {
    const state = createInitialState();
    state.town.buildings.lumber_mill = 3;
    state.town.buildings.market = 5;
    const bonuses = getTownBonuses(state);
    expect(bonuses.woodcuttingSpeed).toBeCloseTo(0.15); // 3 * 0.05
    expect(bonuses.passiveGoldPerMinute).toBe(10); // 5 * 2
  });
});

describe("getBuildingUpgradeCost", () => {
  it("returns correct cost for level 1", () => {
    const cost = getBuildingUpgradeCost("lumber_mill", 0);
    expect(cost.gold).toBe(Math.floor(50 * 1 * 1.5));
    expect(cost.items.normal_log).toBe(Math.floor(10 * 1 * 1.5));
  });

  it("scales with level", () => {
    const cost1 = getBuildingUpgradeCost("lumber_mill", 0);
    const cost5 = getBuildingUpgradeCost("lumber_mill", 4);
    expect(cost5.gold).toBeGreaterThan(cost1.gold);
  });
});

describe("upgradeBuilding", () => {
  it("upgrades when resources are sufficient", () => {
    const state = createInitialState();
    state.gold = 10000;
    addItem(state, "normal_log", 1000);
    const success = upgradeBuilding(state, "lumber_mill");
    expect(success).toBe(true);
    expect(state.town.buildings.lumber_mill).toBe(1);
  });

  it("fails when gold is insufficient", () => {
    const state = createInitialState();
    state.gold = 0;
    addItem(state, "normal_log", 1000);
    const success = upgradeBuilding(state, "lumber_mill");
    expect(success).toBe(false);
    expect(state.town.buildings.lumber_mill).toBe(0);
  });

  it("fails at max level", () => {
    const state = createInitialState();
    state.gold = 999999;
    addItem(state, "normal_log", 99999);
    state.town.buildings.lumber_mill = 10;
    const success = upgradeBuilding(state, "lumber_mill");
    expect(success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/town.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement town system**

Create `src/game/town.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/town.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/town.ts src/tests/town.test.ts
git commit -m "feat: add town building system with tests"
```

---

### Task 7: Skill Processing (TDD)

**Files:**
- Create: `src/game/skills.ts`
- Create: `src/tests/skills.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/skills.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { processSkillTick, startSkillAction, getEffectiveInterval } from "../game/skills";
import { createInitialState } from "../game/state";
import { addItem, getBankItemCount } from "../game/bank";

describe("startSkillAction", () => {
  it("sets active action for gathering skill", () => {
    const state = createInitialState();
    startSkillAction(state, "cut_normal");
    expect(state.activeAction).toEqual({
      type: "skill",
      skillId: "woodcutting",
      actionId: "cut_normal",
      timer: 0,
    });
  });

  it("rejects action if skill level too low", () => {
    const state = createInitialState();
    const success = startSkillAction(state, "cut_oak"); // requires level 10
    expect(success).toBe(false);
    expect(state.activeAction).toBeNull();
  });
});

describe("getEffectiveInterval", () => {
  it("returns base interval with no town bonuses", () => {
    const state = createInitialState();
    const interval = getEffectiveInterval(state, "cut_normal");
    expect(interval).toBe(3);
  });

  it("reduces interval with town speed bonus", () => {
    const state = createInitialState();
    state.town.buildings.lumber_mill = 2; // +10% speed
    const interval = getEffectiveInterval(state, "cut_normal");
    expect(interval).toBeLessThan(3);
    expect(interval).toBeCloseTo(3 / 1.1, 1);
  });
});

describe("processSkillTick", () => {
  it("accumulates timer and completes action", () => {
    const state = createInitialState();
    startSkillAction(state, "cut_normal");
    // Simulate 3.1 seconds (one full action cycle at 3s interval)
    const results = processSkillTick(state, 3.1);
    expect(results.actionsCompleted).toBe(1);
    expect(state.skills.woodcutting.xp).toBe(10);
    expect(getBankItemCount(state, "normal_log")).toBe(1);
    expect(state.activeAction!.timer).toBeCloseTo(0.1, 1);
  });

  it("handles multiple completions in one tick", () => {
    const state = createInitialState();
    startSkillAction(state, "cut_normal");
    const results = processSkillTick(state, 9.5); // 3 full cycles
    expect(results.actionsCompleted).toBe(3);
    expect(state.skills.woodcutting.xp).toBe(30);
    expect(getBankItemCount(state, "normal_log")).toBe(3);
  });

  it("consumes inputs for artisan skills", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 2);
    addItem(state, "tin_ore", 2);
    startSkillAction(state, "smelt_bronze");
    const results = processSkillTick(state, 6.1); // 2 cycles
    expect(results.actionsCompleted).toBe(2);
    expect(getBankItemCount(state, "bronze_bar")).toBe(2);
    expect(getBankItemCount(state, "copper_ore")).toBe(0);
    expect(getBankItemCount(state, "tin_ore")).toBe(0);
  });

  it("stops when inputs run out", () => {
    const state = createInitialState();
    addItem(state, "copper_ore", 1);
    addItem(state, "tin_ore", 1);
    startSkillAction(state, "smelt_bronze");
    const results = processSkillTick(state, 9); // 3 potential cycles but only 1 worth of materials
    expect(results.actionsCompleted).toBe(1);
    expect(results.stoppedNoMaterials).toBe(true);
    expect(state.activeAction).toBeNull();
  });

  it("levels up the skill when XP threshold is crossed", () => {
    const state = createInitialState();
    state.skills.woodcutting.xp = 82; // xpForLevel(2) is 83, so one more action (10 XP) pushes past it
    startSkillAction(state, "cut_normal");
    processSkillTick(state, 3.1);
    expect(state.skills.woodcutting.xp).toBe(92);
    expect(state.skills.woodcutting.level).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/skills.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement skill processing**

Create `src/game/skills.ts`:

```typescript
import { GameState, SkillId, TownBonuses } from "./types";
import { getSkillAction } from "../data/skills";
import { addItem, hasItems, removeItems } from "./bank";
import { levelForXp } from "./xp";
import { getTownBonuses } from "./town";

export interface SkillTickResult {
  actionsCompleted: number;
  xpGained: number;
  stoppedNoMaterials: boolean;
}

/** Start a skill action. Returns false if level requirement not met. */
export function startSkillAction(state: GameState, actionId: string): boolean {
  const action = getSkillAction(actionId);
  const skill = state.skills[action.skillId];
  if (skill.level < action.levelReq) return false;

  // Stop any current action
  state.activeAction = {
    type: "skill",
    skillId: action.skillId,
    actionId: actionId,
    timer: 0,
  };
  state.combat = null;
  return true;
}

/** Get effective interval after town speed bonuses. */
export function getEffectiveInterval(state: GameState, actionId: string): number {
  const action = getSkillAction(actionId);
  const bonuses = getTownBonuses(state);

  let speedBonus = 0;
  switch (action.skillId) {
    case "woodcutting": speedBonus = bonuses.woodcuttingSpeed; break;
    case "mining": speedBonus = bonuses.miningSpeed; break;
    case "fishing": speedBonus = bonuses.fishingSpeed; break;
    case "smithing": speedBonus = bonuses.smithingSpeed; break;
    case "cooking": speedBonus = bonuses.smithingSpeed; break; // cooking uses its own, but spec says Kitchen gives success not speed — no speed bonus for cooking
  }

  // Actually, per spec: Kitchen gives cooking success rate, not speed. Only Forge gives smithing speed.
  // Let's re-check: Lumber Mill = woodcutting speed, Mine Shaft = mining speed, Fishery = fishing speed, Forge = smithing speed, Kitchen = cooking success (no speed)
  // Cooking has no speed bonus building, so speedBonus stays 0 for cooking.
  if (action.skillId === "cooking") speedBonus = 0;

  return action.interval / (1 + speedBonus);
}

/** Process one frame tick for the active skill action. */
export function processSkillTick(state: GameState, dt: number): SkillTickResult {
  const result: SkillTickResult = { actionsCompleted: 0, xpGained: 0, stoppedNoMaterials: false };

  if (!state.activeAction || state.activeAction.type !== "skill" || !state.activeAction.actionId) {
    return result;
  }

  const action = getSkillAction(state.activeAction.actionId);
  const interval = getEffectiveInterval(state, action.id);
  const bonuses = getTownBonuses(state);

  state.activeAction.timer += dt;

  while (state.activeAction && state.activeAction.timer >= interval) {
    state.activeAction.timer -= interval;

    // Check if we have inputs (for artisan skills)
    const hasInputs = Object.keys(action.inputs).length === 0 || hasItems(state, action.inputs);
    if (!hasInputs) {
      result.stoppedNoMaterials = true;
      state.activeAction = null;
      break;
    }

    // Consume inputs
    if (Object.keys(action.inputs).length > 0) {
      removeItems(state, action.inputs);
    }

    // Cooking success check
    if (action.baseSuccessRate !== undefined) {
      const skill = state.skills[action.skillId];
      const levelBonus = (skill.level - action.levelReq) * 0.01;
      const successRate = Math.min(1, action.baseSuccessRate + levelBonus + bonuses.cookingSuccessBonus);
      if (Math.random() > successRate) {
        // Burnt — inputs consumed, no output, but still get XP
        result.actionsCompleted++;
        state.skills[action.skillId].xp += action.xp;
        result.xpGained += action.xp;
        continue;
      }
    }

    // Produce outputs
    for (const [itemId, qty] of Object.entries(action.outputs)) {
      addItem(state, itemId, qty);
    }

    // Award XP
    state.skills[action.skillId].xp += action.xp;
    result.xpGained += action.xp;
    result.actionsCompleted++;

    // Update level
    const newLevel = levelForXp(state.skills[action.skillId].xp);
    if (newLevel > state.skills[action.skillId].level) {
      state.skills[action.skillId].level = newLevel;
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/skills.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/skills.ts src/tests/skills.test.ts
git commit -m "feat: add skill processing engine with tests"
```

---

### Task 8: Combat Processing (TDD)

**Files:**
- Create: `src/game/combat.ts`
- Create: `src/tests/combat.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/combat.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { startCombat, stopCombat, processCombatTick, getPlayerStats, calculateHitChance, rollLoot } from "../game/combat";
import { createInitialState } from "../game/state";
import { addItem } from "../game/bank";
import { equip } from "../game/equipment";

describe("getPlayerStats", () => {
  it("returns base stats with no equipment", () => {
    const state = createInitialState();
    const stats = getPlayerStats(state);
    expect(stats.maxHp).toBe(110); // 100 base + 10 for level 1
    expect(stats.maxHit).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(stats.defence).toBe(0);
    expect(stats.attackSpeed).toBe(3.0); // default unarmed
  });

  it("includes equipment bonuses", () => {
    const state = createInitialState();
    addItem(state, "bronze_sword", 1);
    addItem(state, "bronze_platebody", 1);
    equip(state, "bronze_sword");
    equip(state, "bronze_platebody");
    const stats = getPlayerStats(state);
    expect(stats.maxHit).toBe(13); // 1 base + 12 strength
    expect(stats.accuracy).toBe(65); // 50 base + 15 accuracy
    expect(stats.defence).toBe(8);
    expect(stats.attackSpeed).toBe(2.8);
  });

  it("includes town bonuses", () => {
    const state = createInitialState();
    state.town.buildings.barracks = 3; // +9 accuracy, +15 HP
    state.town.buildings.forge = 2; // +4 max hit
    const stats = getPlayerStats(state);
    expect(stats.maxHit).toBe(5); // 1 base + 4 forge
    expect(stats.accuracy).toBe(59); // 50 base + 9 barracks
    expect(stats.maxHp).toBe(125); // 100 + 10 (level) + 15 (barracks)
  });
});

describe("calculateHitChance", () => {
  it("returns ~50% when accuracy equals evasion", () => {
    const chance = calculateHitChance(100, 100);
    expect(chance).toBeCloseTo(0.5, 1);
  });

  it("returns higher chance when accuracy is higher", () => {
    expect(calculateHitChance(200, 100)).toBeGreaterThan(0.5);
  });

  it("returns lower chance when evasion is higher", () => {
    expect(calculateHitChance(50, 200)).toBeLessThan(0.5);
  });
});

describe("startCombat", () => {
  it("sets up combat state", () => {
    const state = createInitialState();
    startCombat(state, "grasslands");
    expect(state.combat).not.toBeNull();
    expect(state.combat!.currentAreaId).toBe("grasslands");
    expect(state.combat!.monsterHp).toBe(20); // chicken HP
    expect(state.activeAction!.type).toBe("combat");
  });

  it("rejects if combat level too low", () => {
    const state = createInitialState();
    const success = startCombat(state, "forest"); // requires level 10
    expect(success).toBe(false);
    expect(state.combat).toBeNull();
  });
});

describe("rollLoot", () => {
  it("always returns gold", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // no loot drops
    const state = createInitialState();
    const loot = rollLoot("chicken");
    expect(loot.gold).toBeGreaterThanOrEqual(3);
    expect(loot.gold).toBeLessThanOrEqual(8);
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/combat.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement combat system**

Create `src/game/combat.ts`:

```typescript
import { GameState, PlayerStats, CombatState } from "./types";
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
    // Combat XP = monster maxHp / 4
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/combat.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/combat.ts src/tests/combat.test.ts
git commit -m "feat: add combat system with auto-attack, loot, and auto-eat"
```

---

### Task 9: Game Engine & Offline Progress

**Files:**
- Replace: `src/game/engine.ts`
- Create: `src/game/offline.ts`

- [ ] **Step 1: Replace the game engine**

Replace `src/game/engine.ts` entirely:

```typescript
import { GameState } from "./types";
import { processSkillTick, SkillTickResult } from "./skills";
import { processCombatTick, CombatTickResult } from "./combat";
import { getTownBonuses } from "./town";

export type EngineTickResult = {
  skillResult: SkillTickResult | null;
  combatResult: CombatTickResult | null;
  passiveGoldEarned: number;
};

export type TickCallback = (state: GameState, result: EngineTickResult, dt: number) => void;

export class GameEngine {
  state: GameState;
  private lastTick: number;
  private running = false;
  private tickCallbacks: TickCallback[] = [];
  private rafId: number | null = null;

  constructor(state: GameState) {
    this.state = state;
    this.lastTick = Date.now();
  }

  onTick(cb: TickCallback): void {
    this.tickCallbacks.push(cb);
  }

  start(): void {
    this.running = true;
    this.lastTick = Date.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(dt: number): EngineTickResult {
    const result: EngineTickResult = { skillResult: null, combatResult: null, passiveGoldEarned: 0 };

    // Process active action
    if (this.state.activeAction) {
      if (this.state.activeAction.type === "skill") {
        result.skillResult = processSkillTick(this.state, dt);
      } else if (this.state.activeAction.type === "combat") {
        result.combatResult = processCombatTick(this.state, dt);
      }
    }

    // Town passive gold (Market)
    const bonuses = getTownBonuses(this.state);
    if (bonuses.passiveGoldPerMinute > 0) {
      const goldPerSecond = bonuses.passiveGoldPerMinute / 60;
      const earned = goldPerSecond * dt;
      this.state.gold += earned;
      result.passiveGoldEarned = earned;
    }

    return result;
  }

  private loop(): void {
    if (!this.running) return;

    const now = Date.now();
    const dt = Math.min((now - this.lastTick) / 1000, 1); // cap at 1s per frame to avoid huge jumps
    this.lastTick = now;

    const result = this.tick(dt);

    for (const cb of this.tickCallbacks) {
      cb(this.state, result, dt);
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

- [ ] **Step 2: Create offline progress**

Create `src/game/offline.ts`:

```typescript
import { GameState } from "./types";
import { getSkillAction } from "../data/skills";
import { getEffectiveInterval } from "./skills";
import { addItem, hasItems, removeItems } from "./bank";
import { levelForXp } from "./xp";
import { getTownBonuses } from "./town";

const MAX_OFFLINE_SECONDS = 86400; // 24 hours

export interface OfflineResult {
  elapsedSeconds: number;
  skillActionsCompleted: number;
  xpGained: number;
  itemsGained: Record<string, number>;
  goldGained: number;
}

export function calculateOfflineProgress(state: GameState): OfflineResult {
  const now = Date.now();
  const elapsed = Math.min((now - state.stats.lastSavedAt) / 1000, MAX_OFFLINE_SECONDS);

  const result: OfflineResult = {
    elapsedSeconds: elapsed,
    skillActionsCompleted: 0,
    xpGained: 0,
    itemsGained: {},
    goldGained: 0,
  };

  if (elapsed < 1) return result;

  // Passive gold from Market
  const bonuses = getTownBonuses(state);
  if (bonuses.passiveGoldPerMinute > 0) {
    const goldEarned = (bonuses.passiveGoldPerMinute / 60) * elapsed;
    state.gold += goldEarned;
    result.goldGained += goldEarned;
  }

  // Skill actions (combat is skipped offline per spec)
  if (state.activeAction && state.activeAction.type === "skill" && state.activeAction.actionId) {
    const action = getSkillAction(state.activeAction.actionId);
    const interval = getEffectiveInterval(state, action.id);
    let remainingTime = elapsed;

    while (remainingTime >= interval) {
      // Check inputs
      if (Object.keys(action.inputs).length > 0 && !hasItems(state, action.inputs)) {
        state.activeAction = null;
        break;
      }

      remainingTime -= interval;

      // Consume inputs
      if (Object.keys(action.inputs).length > 0) {
        removeItems(state, action.inputs);
      }

      // Success check for cooking
      let succeeded = true;
      if (action.baseSuccessRate !== undefined) {
        const skill = state.skills[action.skillId];
        const levelBonus = (skill.level - action.levelReq) * 0.01;
        const successRate = Math.min(1, action.baseSuccessRate + levelBonus + bonuses.cookingSuccessBonus);
        if (Math.random() > successRate) succeeded = false;
      }

      if (succeeded) {
        for (const [itemId, qty] of Object.entries(action.outputs)) {
          addItem(state, itemId, qty);
          result.itemsGained[itemId] = (result.itemsGained[itemId] ?? 0) + qty;
        }
      }

      state.skills[action.skillId].xp += action.xp;
      result.xpGained += action.xp;
      result.skillActionsCompleted++;

      // Update level
      const newLevel = levelForXp(state.skills[action.skillId].xp);
      if (newLevel > state.skills[action.skillId].level) {
        state.skills[action.skillId].level = newLevel;
      }
    }

    // Keep remaining time as timer progress
    if (state.activeAction) {
      state.activeAction.timer = remainingTime;
    }
  }

  // Combat is paused offline
  if (state.activeAction && state.activeAction.type === "combat") {
    state.activeAction = null;
    state.combat = null;
  }

  return result;
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/game/engine.ts src/game/offline.ts
git commit -m "feat: add game engine tick dispatcher and offline progress"
```

---

### Task 10: Storage Update

**Files:**
- Modify: `src/game/storage.ts`

- [ ] **Step 1: Update storage for new GameState**

Replace `src/game/storage.ts` entirely:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { GameState } from "./types";
import { createInitialState } from "./state";

const SAVE_INTERVAL_MS = 30_000;

export async function saveGame(state: GameState): Promise<void> {
  state.stats.lastSavedAt = Date.now();
  const json = JSON.stringify(state);
  await invoke("save_game", { data: json });
}

export async function loadGame(): Promise<GameState> {
  try {
    const json = await invoke<string>("load_game");
    const loaded = JSON.parse(json) as Partial<GameState>;
    // Merge with defaults to handle missing fields from older saves
    const defaults = createInitialState();
    return {
      ...defaults,
      ...loaded,
      skills: { ...defaults.skills, ...loaded.skills },
      equipment: { ...defaults.equipment, ...loaded.equipment },
      town: {
        buildings: { ...defaults.town.buildings, ...loaded.town?.buildings },
      },
      stats: { ...defaults.stats, ...loaded.stats },
    } as GameState;
  } catch {
    return createInitialState();
  }
}

export function startAutoSave(getState: () => GameState): () => void {
  const id = setInterval(() => {
    saveGame(getState());
  }, SAVE_INTERVAL_MS);
  return () => clearInterval(id);
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/game/storage.ts
git commit -m "feat: update storage for new game state with save migration"
```

---

### Task 11: HTML Shell & CSS

**Files:**
- Replace: `index.html`
- Replace: `src/styles.css`

- [ ] **Step 1: Replace HTML**

Replace `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="/src/styles.css" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Idle Clicker</title>
    <script type="module" src="/src/main.ts" defer></script>
  </head>
  <body>
    <div id="app">
      <!-- Offline banner -->
      <div id="offline-banner" class="offline-banner"></div>

      <!-- Top nav -->
      <nav id="nav" class="nav">
        <div class="nav-tabs">
          <button class="nav-tab active" data-tab="skills">Skills</button>
          <button class="nav-tab" data-tab="combat">Combat</button>
          <button class="nav-tab" data-tab="town">Town</button>
          <button class="nav-tab" data-tab="bank">Bank</button>
        </div>
        <div class="nav-gold">
          <span id="gold-display">0</span> GP
        </div>
      </nav>

      <!-- Skill sub-tabs (visible only on Skills tab) -->
      <div id="skill-subtabs" class="subtabs">
        <button class="subtab active" data-skill="woodcutting">Woodcutting</button>
        <button class="subtab" data-skill="mining">Mining</button>
        <button class="subtab" data-skill="fishing">Fishing</button>
        <button class="subtab" data-skill="smithing">Smithing</button>
        <button class="subtab" data-skill="cooking">Cooking</button>
      </div>

      <!-- Bank filter tabs (visible only on Bank tab) -->
      <div id="bank-filters" class="subtabs" style="display: none;">
        <button class="subtab active" data-filter="all">All</button>
        <button class="subtab" data-filter="resource">Resources</button>
        <button class="subtab" data-filter="food">Food</button>
        <button class="subtab" data-filter="equipment">Equipment</button>
      </div>

      <!-- Main content area -->
      <main id="content" class="content">
        <div id="tab-skills" class="tab-panel active"></div>
        <div id="tab-combat" class="tab-panel"></div>
        <div id="tab-town" class="tab-panel"></div>
        <div id="tab-bank" class="tab-panel"></div>
      </main>

      <!-- Persistent footer -->
      <footer id="footer" class="footer">
        <div class="footer-action">
          <span id="footer-text">Idle</span>
          <div class="footer-progress">
            <div id="footer-bar" class="footer-bar" style="width: 0%"></div>
          </div>
        </div>
      </footer>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Replace CSS**

Replace `src/styles.css` with the full game stylesheet. This is a large file — see the full content below:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #1f2b47;
  --accent: #e94560;
  --accent-glow: rgba(233, 69, 96, 0.3);
  --text: #eee;
  --text-dim: #888;
  --text-muted: #555;
  --gold: #f5c542;
  --green: #4ecca3;
  --red: #e94560;
  --border: rgba(255, 255, 255, 0.06);
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

html, body, #app { height: 100%; overflow: hidden; user-select: none; }

#app { display: flex; flex-direction: column; }

/* Offline banner */
.offline-banner {
  position: fixed; top: 0; left: 0; right: 0; padding: 10px;
  background: var(--bg-secondary); color: var(--gold); text-align: center; font-weight: 600;
  transform: translateY(-100%); transition: transform 0.3s ease; z-index: 100;
}
.offline-banner.visible { transform: translateY(0); }

/* Nav */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; height: 48px; background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.nav-tabs { display: flex; gap: 4px; }
.nav-tab {
  padding: 8px 20px; border: none; background: none;
  color: var(--text-dim); cursor: pointer; font-size: 14px; font-weight: 500;
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.nav-tab:hover { color: var(--text); }
.nav-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.nav-gold { color: var(--gold); font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }

/* Sub-tabs */
.subtabs {
  display: flex; gap: 4px; padding: 8px 16px;
  background: var(--bg); border-bottom: 1px solid var(--border);
}
.subtab {
  padding: 5px 14px; border: none; background: none;
  color: var(--text-dim); cursor: pointer; font-size: 13px;
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.subtab:hover { color: var(--text); }
.subtab.active { color: var(--green); border-bottom-color: var(--green); }

/* Main content */
.content { flex: 1; overflow-y: auto; padding: 16px; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* Skill header */
.skill-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.skill-name { font-size: 18px; font-weight: 700; }
.skill-level { color: var(--gold); font-weight: 600; }
.xp-bar-container {
  flex: 1; margin: 0 16px; height: 8px; background: rgba(255,255,255,0.08);
  border-radius: 4px; overflow: hidden;
}
.xp-bar { height: 100%; background: var(--green); border-radius: 4px; transition: width 0.3s; }
.xp-text { font-size: 12px; color: var(--text-dim); font-variant-numeric: tabular-nums; }

/* Action grid */
.action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.action-card {
  background: var(--bg-card); border-radius: 8px; padding: 12px;
  border: 1px solid var(--border); cursor: pointer; transition: all 0.15s;
}
.action-card:hover { border-color: var(--accent); }
.action-card.active { border-color: var(--accent); box-shadow: 0 0 12px var(--accent-glow); }
.action-card.locked { opacity: 0.4; cursor: not-allowed; }
.action-card .action-name { font-weight: 600; margin-bottom: 4px; }
.action-card .action-info { font-size: 12px; color: var(--text-dim); }
.action-card .action-req { font-size: 11px; color: var(--red); margin-top: 4px; }
.action-card .action-io { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

/* Progress bar (in-skill) */
.action-progress {
  margin-top: 16px; padding: 12px; background: var(--bg-card);
  border-radius: 8px; border: 1px solid var(--border);
}
.action-progress .progress-label { font-size: 13px; margin-bottom: 6px; color: var(--text-dim); }
.progress-bar-container {
  height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden;
}
.progress-bar { height: 100%; background: var(--accent); border-radius: 5px; transition: width 0.05s linear; }

/* Combat layout */
.combat-layout { display: grid; grid-template-columns: 250px 1fr 250px; gap: 16px; height: 100%; }
.combat-panel {
  background: var(--bg-card); border-radius: 8px; padding: 14px;
  border: 1px solid var(--border);
}
.combat-panel h3 { font-size: 14px; color: var(--text-dim); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }

/* HP bars */
.hp-bar-container {
  height: 14px; background: rgba(255,255,255,0.08); border-radius: 7px;
  overflow: hidden; margin: 6px 0;
}
.hp-bar { height: 100%; border-radius: 7px; transition: width 0.15s; }
.hp-bar.player { background: var(--green); }
.hp-bar.monster { background: var(--red); }
.hp-text { font-size: 12px; font-variant-numeric: tabular-nums; }

/* Stat row */
.stat-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
.stat-label { color: var(--text-dim); }
.stat-value { font-weight: 600; font-variant-numeric: tabular-nums; }

/* Equipment slot */
.equip-slot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 8px; margin: 3px 0; background: rgba(255,255,255,0.03);
  border-radius: 4px; font-size: 12px;
}
.equip-slot .slot-name { color: var(--text-dim); }
.equip-slot .slot-item { color: var(--text); font-weight: 500; }
.equip-slot .slot-empty { color: var(--text-muted); font-style: italic; }

/* Area selection */
.area-list { display: flex; flex-direction: column; gap: 8px; }
.area-card {
  padding: 10px; background: var(--bg-card); border-radius: 6px;
  border: 1px solid var(--border); cursor: pointer; transition: all 0.15s;
}
.area-card:hover { border-color: var(--accent); }
.area-card.active { border-color: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
.area-card.locked { opacity: 0.4; cursor: not-allowed; }
.area-name { font-weight: 600; }
.area-req { font-size: 11px; color: var(--text-dim); }

/* Monster info */
.monster-name { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.respawn-text { color: var(--text-dim); font-size: 14px; text-align: center; padding: 20px; }

/* Loot log */
.loot-log { max-height: 400px; overflow-y: auto; }
.loot-entry { font-size: 12px; padding: 3px 0; border-bottom: 1px solid var(--border); }
.loot-entry .loot-gold { color: var(--gold); }
.loot-entry .loot-item { color: var(--green); }

/* Town grid */
.building-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.building-card {
  background: var(--bg-card); border-radius: 8px; padding: 16px;
  border: 1px solid var(--border);
}
.building-card .building-name { font-size: 16px; font-weight: 700; }
.building-card .building-level { font-size: 13px; color: var(--gold); margin-top: 2px; }
.building-card .building-effect { font-size: 12px; color: var(--green); margin-top: 6px; }
.building-card .building-cost { font-size: 12px; color: var(--text-dim); margin-top: 8px; }
.upgrade-btn {
  margin-top: 10px; padding: 8px 16px; width: 100%;
  border: none; border-radius: 6px; cursor: pointer;
  font-weight: 600; font-size: 13px; transition: all 0.15s;
  background: var(--accent); color: white;
}
.upgrade-btn:hover { filter: brightness(1.15); }
.upgrade-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: none; }
.building-maxed { font-size: 12px; color: var(--gold); margin-top: 10px; font-weight: 600; }

/* Bank grid */
.bank-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
.bank-item {
  background: var(--bg-card); border-radius: 6px; padding: 8px;
  border: 1px solid var(--border); cursor: pointer; text-align: center;
  transition: all 0.15s; min-height: 70px;
}
.bank-item:hover { border-color: var(--accent); }
.bank-item.selected { border-color: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
.bank-item .item-name { font-size: 11px; font-weight: 500; word-break: break-word; }
.bank-item .item-qty { font-size: 13px; font-weight: 700; color: var(--gold); margin-top: 2px; }

/* Bank context panel */
.bank-context {
  position: fixed; right: 16px; top: 120px; width: 260px;
  background: var(--bg-card); border-radius: 8px; padding: 16px;
  border: 1px solid var(--border); z-index: 50;
}
.bank-context .context-name { font-size: 16px; font-weight: 700; }
.bank-context .context-category { font-size: 11px; color: var(--text-dim); text-transform: uppercase; }
.bank-context .context-stats { margin-top: 8px; }
.context-btn {
  margin-top: 8px; padding: 6px 12px; width: 100%;
  border: none; border-radius: 5px; cursor: pointer;
  font-weight: 600; font-size: 12px; transition: all 0.15s;
}
.context-btn.equip { background: var(--green); color: #111; }
.context-btn.sell { background: var(--gold); color: #111; }
.context-btn.unequip { background: var(--text-dim); color: #111; }
.context-btn:hover { filter: brightness(1.15); }

/* Footer */
.footer {
  padding: 10px 16px; background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}
.footer-action { display: flex; align-items: center; gap: 12px; }
#footer-text { font-size: 13px; color: var(--text-dim); white-space: nowrap; min-width: 200px; }
.footer-progress { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.footer-bar { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.05s linear; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
```

- [ ] **Step 3: Verify HTML/CSS loads with Vite**

Run: `npx vite build`
Expected: Build succeeds (may have TS import errors from main.ts — that's fine, we'll fix in Task 15)

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles.css
git commit -m "feat: add game HTML shell and CSS theme"
```

---

### Task 12: UI Router, Nav & Footer

**Files:**
- Create: `src/ui/router.ts`
- Create: `src/ui/nav.ts`
- Create: `src/ui/footer.ts`

- [ ] **Step 1: Create router**

Create `src/ui/router.ts`:

```typescript
export type MainTab = "skills" | "combat" | "town" | "bank";
export type SkillSubTab = "woodcutting" | "mining" | "fishing" | "smithing" | "cooking";
export type BankFilter = "all" | "resource" | "food" | "equipment";

export interface UIState {
  activeTab: MainTab;
  activeSkill: SkillSubTab;
  bankFilter: BankFilter;
  selectedBankItem: string | null;
}

let uiState: UIState = {
  activeTab: "skills",
  activeSkill: "woodcutting",
  bankFilter: "all",
  selectedBankItem: null,
};

type Listener = () => void;
const listeners: Listener[] = [];

export function getUIState(): UIState {
  return uiState;
}

export function onUIChange(fn: Listener): void {
  listeners.push(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function switchTab(tab: MainTab): void {
  uiState.activeTab = tab;
  uiState.selectedBankItem = null;
  notify();
}

export function switchSkill(skill: SkillSubTab): void {
  uiState.activeSkill = skill;
  notify();
}

export function setBankFilter(filter: BankFilter): void {
  uiState.bankFilter = filter;
  uiState.selectedBankItem = null;
  notify();
}

export function selectBankItem(itemId: string | null): void {
  uiState.selectedBankItem = itemId;
  notify();
}
```

- [ ] **Step 2: Create nav rendering**

Create `src/ui/nav.ts`:

```typescript
import { switchTab, switchSkill, setBankFilter, getUIState, MainTab, SkillSubTab, BankFilter } from "./router";
import { GameState } from "../game/types";
import { formatNumber } from "../game/state";

export function initNav(): void {
  // Main tab clicks
  document.querySelectorAll<HTMLButtonElement>(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab as MainTab);
    });
  });

  // Skill sub-tab clicks
  document.querySelectorAll<HTMLButtonElement>("#skill-subtabs .subtab").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchSkill(btn.dataset.skill as SkillSubTab);
    });
  });

  // Bank filter clicks
  document.querySelectorAll<HTMLButtonElement>("#bank-filters .subtab").forEach((btn) => {
    btn.addEventListener("click", () => {
      setBankFilter(btn.dataset.filter as BankFilter);
    });
  });
}

export function updateNav(state: GameState): void {
  const ui = getUIState();

  // Gold display
  document.getElementById("gold-display")!.textContent = formatNumber(state.gold);

  // Active main tab
  document.querySelectorAll<HTMLButtonElement>(".nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === ui.activeTab);
  });

  // Tab panels
  document.querySelectorAll<HTMLElement>(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${ui.activeTab}`);
  });

  // Sub-tabs visibility
  const skillSubtabs = document.getElementById("skill-subtabs")!;
  const bankFilters = document.getElementById("bank-filters")!;
  skillSubtabs.style.display = ui.activeTab === "skills" ? "flex" : "none";
  bankFilters.style.display = ui.activeTab === "bank" ? "flex" : "none";

  // Active skill sub-tab
  document.querySelectorAll<HTMLButtonElement>("#skill-subtabs .subtab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.skill === ui.activeSkill);
  });

  // Active bank filter
  document.querySelectorAll<HTMLButtonElement>("#bank-filters .subtab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === ui.bankFilter);
  });
}
```

- [ ] **Step 3: Create footer rendering**

Create `src/ui/footer.ts`:

```typescript
import { GameState } from "../game/types";
import { getSkillAction } from "../data/skills";
import { getMonster, getCombatArea } from "../data/monsters";
import { getEffectiveInterval } from "../game/skills";

export function updateFooter(state: GameState): void {
  const textEl = document.getElementById("footer-text")!;
  const barEl = document.getElementById("footer-bar")!;

  if (!state.activeAction) {
    textEl.textContent = "Idle";
    barEl.style.width = "0%";
    return;
  }

  if (state.activeAction.type === "skill" && state.activeAction.actionId) {
    const action = getSkillAction(state.activeAction.actionId);
    const interval = getEffectiveInterval(state, action.id);
    const progress = (state.activeAction.timer / interval) * 100;
    textEl.textContent = `${action.name}...`;
    barEl.style.width = `${Math.min(100, progress)}%`;
  } else if (state.activeAction.type === "combat" && state.combat) {
    const area = getCombatArea(state.combat.currentAreaId);
    const monster = getMonster(area.monsterIds[state.combat.currentMonsterIndex]);
    if (state.combat.respawnTimer > 0) {
      textEl.textContent = `Waiting for next monster...`;
      barEl.style.width = `${((3 - state.combat.respawnTimer) / 3) * 100}%`;
    } else {
      textEl.textContent = `Fighting ${monster.name}...`;
      const hpPercent = (state.combat.monsterHp / monster.hp) * 100;
      barEl.style.width = `${Math.max(0, 100 - hpPercent)}%`;
    }
  }
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/ui/
git commit -m "feat: add UI router, navigation, and footer"
```

---

### Task 13: Skills & Combat Views

**Files:**
- Create: `src/ui/skills-view.ts`
- Create: `src/ui/combat-view.ts`

- [ ] **Step 1: Create skills view**

Create `src/ui/skills-view.ts`:

```typescript
import { GameState, SkillId } from "../game/types";
import { getSkillActions } from "../data/skills";
import { getItem } from "../data/items";
import { startSkillAction, getEffectiveInterval } from "../game/skills";
import { hasItems, getBankItemCount } from "../game/bank";
import { xpForLevel, xpProgress } from "../game/xp";
import { formatNumber } from "../game/state";
import { getUIState } from "./router";

export function renderSkillsView(state: GameState, container: HTMLElement): void {
  const ui = getUIState();
  const skillId = ui.activeSkill as SkillId;
  const skill = state.skills[skillId];
  const actions = getSkillActions(skillId);

  const activeActionId = state.activeAction?.type === "skill" && state.activeAction.skillId === skillId
    ? state.activeAction.actionId
    : null;

  let html = `
    <div class="skill-header">
      <span class="skill-name">${capitalize(skillId)}</span>
      <span class="skill-level">Lv ${skill.level}</span>
      <div class="xp-bar-container"><div class="xp-bar" style="width: ${xpProgress(skill.level, skill.xp) * 100}%"></div></div>
      <span class="xp-text">${formatNumber(skill.xp)} / ${formatNumber(xpForLevel(skill.level + 1))} XP</span>
    </div>
    <div class="action-grid">
  `;

  for (const action of actions) {
    const locked = skill.level < action.levelReq;
    const isActive = activeActionId === action.id;
    const hasInput = Object.keys(action.inputs).length === 0 || hasItems(state, action.inputs);

    let ioText = "";
    const inputParts = Object.entries(action.inputs).map(([id, qty]) => `${getItem(id).name} ×${qty}`);
    const outputParts = Object.entries(action.outputs).map(([id, qty]) => `${getItem(id).name} ×${qty}`);
    if (inputParts.length > 0) {
      ioText = `${inputParts.join(", ")} → ${outputParts.join(", ")}`;
    } else {
      ioText = outputParts.join(", ");
    }

    const interval = locked ? action.interval : getEffectiveInterval(state, action.id);

    html += `
      <div class="action-card ${locked ? 'locked' : ''} ${isActive ? 'active' : ''}"
           data-action-id="${action.id}" ${locked ? '' : 'role="button"'}>
        <div class="action-name">${action.name}</div>
        <div class="action-info">${interval.toFixed(1)}s · ${action.xp} XP</div>
        <div class="action-io">${ioText}</div>
        ${locked ? `<div class="action-req">Requires Lv ${action.levelReq}</div>` : ''}
        ${!locked && !hasInput ? `<div class="action-req">Missing materials</div>` : ''}
        ${action.baseSuccessRate !== undefined && !locked ? `<div class="action-info">Success: ${Math.round(getSuccessRate(state, action) * 100)}%</div>` : ''}
      </div>
    `;
  }

  html += `</div>`;

  // Active action progress
  if (activeActionId && state.activeAction) {
    const action = actions.find(a => a.id === activeActionId);
    if (action) {
      const interval = getEffectiveInterval(state, action.id);
      const progress = (state.activeAction.timer / interval) * 100;
      html += `
        <div class="action-progress">
          <div class="progress-label">${action.name}...</div>
          <div class="progress-bar-container"><div class="progress-bar" style="width: ${Math.min(100, progress)}%"></div></div>
        </div>
      `;
    }
  }

  container.innerHTML = html;

  // Attach click handlers
  container.querySelectorAll<HTMLElement>(".action-card:not(.locked)").forEach((card) => {
    card.addEventListener("click", () => {
      const actionId = card.dataset.actionId!;
      startSkillAction(state, actionId);
    });
  });
}

function getSuccessRate(state: GameState, action: { skillId: SkillId; levelReq: number; baseSuccessRate?: number }): number {
  if (action.baseSuccessRate === undefined) return 1;
  const skill = state.skills[action.skillId];
  const levelBonus = (skill.level - action.levelReq) * 0.01;
  // Note: town cooking success bonus would be added here in actual processing
  return Math.min(1, action.baseSuccessRate + levelBonus);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 2: Create combat view**

Create `src/ui/combat-view.ts`:

```typescript
import { GameState } from "../game/types";
import { COMBAT_AREAS, getMonster, getCombatArea } from "../data/monsters";
import { getItem } from "../data/items";
import { startCombat, stopCombat, getPlayerStats } from "../game/combat";
import { getBankItemCount } from "../game/bank";
import { formatNumber } from "../game/state";

// In-memory loot log (not persisted)
const lootLog: string[] = [];
const MAX_LOOT_LOG = 50;

export function addLootLogEntry(entry: string): void {
  lootLog.unshift(entry);
  if (lootLog.length > MAX_LOOT_LOG) lootLog.pop();
}

export function renderCombatView(state: GameState, container: HTMLElement): void {
  const stats = getPlayerStats(state);
  const combatLevel = state.skills.combat.level;
  const isInCombat = state.combat !== null;

  let html = `<div class="combat-layout">`;

  // Left panel: player stats + equipment
  html += `<div class="combat-panel">
    <h3>Player</h3>
    <div class="stat-row"><span class="stat-label">Combat Lv</span><span class="stat-value">${combatLevel}</span></div>
    <div class="stat-row"><span class="stat-label">Max HP</span><span class="stat-value">${stats.maxHp}</span></div>
    <div class="stat-row"><span class="stat-label">Max Hit</span><span class="stat-value">${stats.maxHit}</span></div>
    <div class="stat-row"><span class="stat-label">Accuracy</span><span class="stat-value">${stats.accuracy}</span></div>
    <div class="stat-row"><span class="stat-label">Defence</span><span class="stat-value">${stats.defence}</span></div>
    <div class="stat-row"><span class="stat-label">Atk Speed</span><span class="stat-value">${stats.attackSpeed.toFixed(1)}s</span></div>
    <div style="margin-top: 10px;">
      <h3>Equipment</h3>
      ${renderEquipSlot("Weapon", state.equipment.weapon)}
      ${renderEquipSlot("Head", state.equipment.head)}
      ${renderEquipSlot("Body", state.equipment.body)}
      ${renderEquipSlot("Legs", state.equipment.legs)}
      ${renderEquipSlot("Feet", state.equipment.feet)}
      ${renderEquipSlot("Food", state.equipment.food, state)}
    </div>
  </div>`;

  // Center panel: area selection or active combat
  html += `<div class="combat-panel">`;
  if (isInCombat && state.combat) {
    const area = getCombatArea(state.combat.currentAreaId);
    const monster = getMonster(area.monsterIds[state.combat.currentMonsterIndex]);
    const monsterHpPct = Math.max(0, (state.combat.monsterHp / monster.hp) * 100);
    const playerHpPct = Math.max(0, (state.combat.playerHp / stats.maxHp) * 100);

    if (state.combat.respawnTimer > 0) {
      html += `<div class="respawn-text">Monster defeated! Next in ${state.combat.respawnTimer.toFixed(1)}s...</div>`;
    } else {
      html += `
        <div class="monster-name">${monster.name}</div>
        <div class="hp-text">Monster HP: ${Math.max(0, Math.ceil(state.combat.monsterHp))} / ${monster.hp}</div>
        <div class="hp-bar-container"><div class="hp-bar monster" style="width: ${monsterHpPct}%"></div></div>
        <div style="margin-top: 16px;"></div>
        <div class="hp-text">Your HP: ${Math.ceil(state.combat.playerHp)} / ${stats.maxHp}</div>
        <div class="hp-bar-container"><div class="hp-bar player" style="width: ${playerHpPct}%"></div></div>
      `;
    }
    html += `<button class="upgrade-btn" style="margin-top: 16px;" id="btn-flee">Flee</button>`;
  } else {
    html += `<h3>Combat Areas</h3><div class="area-list">`;
    for (const area of COMBAT_AREAS) {
      const locked = combatLevel < area.levelReq;
      html += `
        <div class="area-card ${locked ? 'locked' : ''}" data-area-id="${area.id}" ${locked ? '' : 'role="button"'}>
          <div class="area-name">${area.name}</div>
          <div class="area-req">${locked ? `Requires Combat Lv ${area.levelReq}` : `Lv ${area.levelReq}+`}</div>
          <div class="action-info">${area.monsterIds.map(id => getMonster(id).name).join(", ")}</div>
        </div>
      `;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Right panel: loot log
  html += `<div class="combat-panel">
    <h3>Loot Log</h3>
    <div class="loot-log">
      ${lootLog.length === 0 ? '<div style="color: var(--text-muted); font-size: 12px;">No loot yet...</div>' : ''}
      ${lootLog.map(entry => `<div class="loot-entry">${entry}</div>`).join('')}
    </div>
  </div>`;

  html += `</div>`;
  container.innerHTML = html;

  // Event handlers
  if (isInCombat) {
    document.getElementById("btn-flee")?.addEventListener("click", () => stopCombat(state));
  } else {
    container.querySelectorAll<HTMLElement>(".area-card:not(.locked)").forEach((card) => {
      card.addEventListener("click", () => startCombat(state, card.dataset.areaId!));
    });
  }
}

function renderEquipSlot(label: string, itemId: string | null, state?: GameState): string {
  if (itemId) {
    const item = getItem(itemId);
    let extra = "";
    if (label === "Food" && state) {
      const qty = getBankItemCount(state, itemId);
      extra = ` (${formatNumber(qty)})`;
    }
    return `<div class="equip-slot"><span class="slot-name">${label}</span><span class="slot-item">${item.name}${extra}</span></div>`;
  }
  return `<div class="equip-slot"><span class="slot-name">${label}</span><span class="slot-empty">Empty</span></div>`;
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/ui/skills-view.ts src/ui/combat-view.ts
git commit -m "feat: add skills and combat UI views"
```

---

### Task 14: Town & Bank Views

**Files:**
- Create: `src/ui/town-view.ts`
- Create: `src/ui/bank-view.ts`

- [ ] **Step 1: Create town view**

Create `src/ui/town-view.ts`:

```typescript
import { GameState, BuildingId } from "../game/types";
import { BUILDINGS } from "../data/buildings";
import { getItem } from "../data/items";
import { canAffordUpgrade, upgradeBuilding, getBuildingUpgradeCost, getTownBonuses } from "../game/town";
import { formatNumber } from "../game/state";

export function renderTownView(state: GameState, container: HTMLElement): void {
  const bonuses = getTownBonuses(state);

  let html = `<div class="building-grid">`;

  for (const def of BUILDINGS) {
    const level = state.town.buildings[def.id] ?? 0;
    const isMaxed = level >= def.maxLevel;
    const canAfford = !isMaxed && canAffordUpgrade(state, def.id);

    html += `<div class="building-card">
      <div class="building-name">${def.name}</div>
      <div class="building-level">Lv ${level} / ${def.maxLevel}</div>
      <div class="building-effect">${getBonusText(def.id, level)}</div>
    `;

    if (isMaxed) {
      html += `<div class="building-maxed">MAX LEVEL</div>`;
    } else {
      const cost = getBuildingUpgradeCost(def.id, level);
      const costParts: string[] = [];
      if (cost.gold > 0) costParts.push(`${formatNumber(cost.gold)} GP`);
      for (const [itemId, qty] of Object.entries(cost.items)) {
        costParts.push(`${formatNumber(qty)} ${getItem(itemId).name}`);
      }
      html += `<div class="building-cost">Cost: ${costParts.join(", ")}</div>`;
      html += `<button class="upgrade-btn" data-building="${def.id}" ${canAfford ? '' : 'disabled'}>Upgrade</button>`;
    }

    html += `</div>`;
  }

  html += `</div>`;

  // Market passive income display
  if (bonuses.passiveGoldPerMinute > 0) {
    html += `<div style="margin-top: 16px; text-align: center; color: var(--gold); font-size: 13px;">
      Market income: +${formatNumber(bonuses.passiveGoldPerMinute)} GP/min
    </div>`;
  }

  container.innerHTML = html;

  // Upgrade click handlers
  container.querySelectorAll<HTMLButtonElement>(".upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      upgradeBuilding(state, btn.dataset.building as BuildingId);
    });
  });
}

function getBonusText(buildingId: BuildingId, level: number): string {
  if (level === 0) return "No bonus yet";
  switch (buildingId) {
    case "lumber_mill": return `+${level * 5}% Woodcutting speed`;
    case "mine_shaft": return `+${level * 5}% Mining speed`;
    case "fishery": return `+${level * 5}% Fishing speed`;
    case "forge": return `+${level * 5}% Smithing speed, +${level * 2} max hit`;
    case "kitchen": return `+${level * 10}% cooking success, +${level * 5} food healing`;
    case "barracks": return `+${level * 3}% accuracy, +${level * 5} max HP`;
    case "market": return `+${level * 2} GP/min`;
    default: return "";
  }
}
```

- [ ] **Step 2: Create bank view**

Create `src/ui/bank-view.ts`:

```typescript
import { GameState, EquipSlot } from "../game/types";
import { ITEMS, getItem } from "../data/items";
import { sellItem, getBankItemCount } from "../game/bank";
import { equip, unequip } from "../game/equipment";
import { formatNumber } from "../game/state";
import { getUIState, selectBankItem } from "./router";

export function renderBankView(state: GameState, container: HTMLElement): void {
  const ui = getUIState();
  const filter = ui.bankFilter;

  // Collect all items in bank
  const bankEntries = Object.entries(state.bank)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty, def: ITEMS[id] }))
    .filter((e) => e.def !== undefined)
    .filter((e) => filter === "all" || e.def.category === filter)
    .sort((a, b) => {
      const catOrder = { resource: 0, food: 1, equipment: 2 };
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

  // Context panel (if item selected)
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

    // Equip/unequip button
    if (item.equipSlot) {
      const isEquipped = state.equipment[item.equipSlot] === ui.selectedBankItem;
      if (isEquipped) {
        html += `<button class="context-btn unequip" data-action="unequip" data-slot="${item.equipSlot}">Unequip</button>`;
      } else {
        html += `<button class="context-btn equip" data-action="equip" data-item="${ui.selectedBankItem}">Equip</button>`;
      }
    }
    if (item.category === "food" && item.equipSlot === undefined) {
      // Food items are equippable in food slot but use equipSlot on the item def
      // Actually food items in our data DO have no equipSlot. We need to handle food equipping differently.
      // Food is equipped to the "food" slot. Let's check:
    }
    if (item.healAmount) {
      // Food: equipping just marks the type to eat (no bank movement — combat eats from bank)
      const isEquipped = state.equipment.food === ui.selectedBankItem;
      if (isEquipped) {
        html += `<button class="context-btn unequip" data-action="unequip-food">Unequip Food</button>`;
      } else {
        html += `<button class="context-btn equip" data-action="equip-food" data-item="${ui.selectedBankItem}">Equip as Food</button>`;
      }
    }

    // Sell button
    html += `<button class="context-btn sell" data-action="sell" data-item="${ui.selectedBankItem}">Sell for ${formatNumber(item.sellPrice)} GP</button>`;

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Event handlers
  container.querySelectorAll<HTMLElement>(".bank-item").forEach((el) => {
    el.addEventListener("click", () => selectBankItem(el.dataset.itemId!));
  });

  container.querySelectorAll<HTMLButtonElement>(".context-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "equip") {
        equip(state, btn.dataset.item!);
      } else if (action === "equip-food") {
        // Food equip just marks the type — no bank movement (combat eats from bank directly)
        state.equipment.food = btn.dataset.item!;
      } else if (action === "unequip-food") {
        state.equipment.food = null;
      } else if (action === "unequip") {
        unequip(state, btn.dataset.slot as EquipSlot);
      } else if (action === "sell") {
        sellItem(state, btn.dataset.item!, 1);
        if (!state.bank[btn.dataset.item!]) selectBankItem(null);
      }
    });
  });
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/ui/town-view.ts src/ui/bank-view.ts
git commit -m "feat: add town and bank UI views"
```

---

### Task 15: Main Entry Point & Integration

**Files:**
- Replace: `src/main.ts`
- Delete: `src/game/renderer.ts` (replaced by UI views)
- Modify: `src-tauri/tauri.conf.json` (window size)

- [ ] **Step 1: Replace main entry point**

Replace `src/main.ts`:

```typescript
import { GameEngine } from "./game/engine";
import { loadGame, saveGame, startAutoSave } from "./game/storage";
import { calculateOfflineProgress } from "./game/offline";
import { formatNumber } from "./game/state";
import { initNav, updateNav } from "./ui/nav";
import { updateFooter } from "./ui/footer";
import { renderSkillsView } from "./ui/skills-view";
import { renderCombatView, addLootLogEntry } from "./ui/combat-view";
import { renderTownView } from "./ui/town-view";
import { renderBankView } from "./ui/bank-view";
import { getUIState, onUIChange } from "./ui/router";
import { getItem } from "./data/items";

async function init() {
  const state = await loadGame();
  const engine = new GameEngine(state);

  // Offline progress
  const offlineResult = calculateOfflineProgress(state);
  if (offlineResult.elapsedSeconds > 5) {
    const offlineEl = document.getElementById("offline-banner")!;
    const parts: string[] = [];
    if (offlineResult.skillActionsCompleted > 0) parts.push(`${offlineResult.skillActionsCompleted} actions`);
    if (offlineResult.xpGained > 0) parts.push(`${formatNumber(offlineResult.xpGained)} XP`);
    if (offlineResult.goldGained > 0) parts.push(`${formatNumber(offlineResult.goldGained)} GP`);
    const itemCount = Object.values(offlineResult.itemsGained).reduce((a, b) => a + b, 0);
    if (itemCount > 0) parts.push(`${formatNumber(itemCount)} items`);
    if (parts.length > 0) {
      offlineEl.textContent = `Welcome back! You earned: ${parts.join(", ")}`;
      offlineEl.classList.add("visible");
      setTimeout(() => offlineEl.classList.remove("visible"), 5000);
    }
  }

  // Init UI
  initNav();

  // Full re-render function
  function renderAll() {
    const ui = getUIState();
    updateNav(state);
    updateFooter(state);

    const skillsPanel = document.getElementById("tab-skills")!;
    const combatPanel = document.getElementById("tab-combat")!;
    const townPanel = document.getElementById("tab-town")!;
    const bankPanel = document.getElementById("tab-bank")!;

    // Only render the active tab (performance)
    if (ui.activeTab === "skills") renderSkillsView(state, skillsPanel);
    if (ui.activeTab === "combat") renderCombatView(state, combatPanel);
    if (ui.activeTab === "town") renderTownView(state, townPanel);
    if (ui.activeTab === "bank") renderBankView(state, bankPanel);
  }

  // Re-render on UI state changes (tab switches, etc.)
  onUIChange(renderAll);

  // Throttled render: re-render at ~10fps for the active view
  let renderAccum = 0;
  engine.onTick((_state, result, dt) => {
    // Process loot log entries
    if (result.combatResult?.loot) {
      const loot = result.combatResult.loot;
      let entry = `<span class="loot-gold">+${loot.gold} GP</span>`;
      for (const item of loot.items) {
        entry += ` <span class="loot-item">+${item.quantity} ${getItem(item.itemId).name}</span>`;
      }
      addLootLogEntry(entry);
    }
    if (result.combatResult?.playerDied) {
      addLootLogEntry('<span style="color: var(--red);">You died!</span>');
    }

    renderAccum += dt;
    if (renderAccum >= 0.1) {
      renderAccum = 0;
      renderAll();
    }
  });

  // Auto-save
  const stopAutoSave = startAutoSave(() => engine.state);
  window.addEventListener("beforeunload", () => {
    stopAutoSave();
    saveGame(engine.state);
  });

  // Initial render
  renderAll();

  // Start
  engine.start();
}

window.addEventListener("DOMContentLoaded", init);
```

- [ ] **Step 2: Delete old renderer**

Delete `src/game/renderer.ts` — it's fully replaced by the new UI views.

```bash
rm src/game/renderer.ts
```

- [ ] **Step 3: Update window size in Tauri config**

In `src-tauri/tauri.conf.json`, change the window width/height to give more room for the game UI:

Change `"width": 800` to `"width": 1100` and `"height": 600` to `"height": 750`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Verify the app launches**

Run: `source ~/.cargo/env && npm run tauri dev`
Expected: Tauri window opens with the game UI — tab navigation works, skills view shows woodcutting actions, clicking an action starts the timer.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire up complete game UI with all systems integrated"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run tauri dev` — app launches, no console errors
- [ ] Click a Woodcutting action → timer runs, logs appear in bank
- [ ] Switch to Mining → different actions shown
- [ ] Smelt Bronze Bar (requires copper + tin ore in bank) → bar appears
- [ ] Start combat in Grasslands → auto-attack runs, HP bars move
- [ ] Equip food and weapon from bank → combat stats update
- [ ] Upgrade a town building → gold deducted, bonus shown
- [ ] Close and reopen → save/load works, offline progress calculated
