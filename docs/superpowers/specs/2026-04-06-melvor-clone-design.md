# Minimal Melvor Idle Clone — Design Spec

## Overview

A simplified Melvor Idle clone built with Tauri v2 + vanilla TypeScript. The game is a menu-driven idle RPG where players gather resources via skills, craft equipment and food, fight monsters in combat areas, and upgrade a town for passive bonuses. All game logic lives in TypeScript; Rust handles only save/load persistence.

## Architecture

**Approach:** Monolithic frontend. All game logic (skills, combat, town, XP, items) runs in TypeScript within the Tauri webview. Rust backend provides two IPC commands: `save_game` and `load_game`, writing JSON to the OS app data directory.

**Tech Stack:**
- Tauri v2 (desktop shell)
- TypeScript + Vite (frontend)
- Vanilla DOM (no framework)
- Rust (persistence only)

## Core Game Loop

### Tick System
The game runs on a unified `requestAnimationFrame` loop. Each frame:
1. If a skill action is active, advance its timer by `dt` (delta seconds)
2. When the action timer completes → award XP + items, reset timer, auto-repeat
3. If combat is active, advance player and monster attack timers independently
4. Town passive income (Market building) accumulates per second

**Constraint:** Only one skill action OR combat can be active at a time.

### Game State

Single serializable object persisted as JSON:

```typescript
interface GameState {
  skills: Record<SkillId, { level: number; xp: number }>;
  bank: Record<ItemId, number>;
  equipment: {
    weapon: ItemId | null;
    head: ItemId | null;
    body: ItemId | null;
    legs: ItemId | null;
    feet: ItemId | null;
    food: ItemId | null;
  };
  combat: {
    currentAreaId: string;
    currentMonsterIndex: number;
    playerHp: number;
    monsterHp: number;
    respawnTimer: number;
  } | null;
  town: { buildings: Record<BuildingId, number> };
  activeAction: {
    type: "skill" | "combat";
    skillId?: SkillId;
    actionId?: string;
    areaId?: string;
    timer: number;
  } | null;
  gold: number;
  stats: {
    startedAt: number;
    lastSavedAt: number;
  };
}
```

### XP & Leveling

Melvor-style exponential curve. XP required doubles approximately every 7 levels:

```
xpForLevel(L) = floor(1/4 * (L - 1 + 300 * 2^((L-1)/7)))
```

- Level cap: 99
- Each level unlocks new actions/recipes within the corresponding skill
- Total XP to 99: ~13M

### Offline Progress

On load, calculate elapsed seconds since `lastSavedAt` (capped at 24 hours = 86,400 seconds):
- **For skill actions:** `ticksElapsed = elapsed / actionInterval`. Grant `ticksElapsed * xpPerAction` XP and `ticksElapsed * itemsPerAction` items.
- **For combat:** Skipped. Combat is paused while offline (too many edge cases with food consumption, death, monster switching). Player returns to idle state.
- **For town Market:** Grant `elapsed * goldPerSecond` passive gold.

### Save System

- Auto-save every 30 seconds
- Save on window close (`beforeunload`)
- Save on manual trigger (future: save button)
- Rust backend writes to `{app_data_dir}/save.json`

## Skills

### Shared Mechanics

Every skill action follows the same pattern:
1. Player selects an action from the skill view
2. A timer starts (action-specific interval, typically 2-5 seconds)
3. Timer completes → player receives XP + output items → timer auto-restarts
4. Higher skill levels unlock new actions with better XP and item yields
5. Town building bonuses can reduce action intervals (speed boost)

### Gathering Skills

#### Woodcutting

| Action | Level Req | Interval | XP | Output |
|--------|-----------|----------|----|--------|
| Normal Tree | 1 | 3s | 10 | Normal Log ×1 |
| Oak Tree | 10 | 3.5s | 25 | Oak Log ×1 |
| Willow Tree | 25 | 4s | 50 | Willow Log ×1 |
| Maple Tree | 40 | 4s | 80 | Maple Log ×1 |
| Yew Tree | 60 | 4.5s | 120 | Yew Log ×1 |

#### Mining

| Action | Level Req | Interval | XP | Output |
|--------|-----------|----------|----|--------|
| Copper Rock | 1 | 3s | 10 | Copper Ore ×1 |
| Tin Rock | 1 | 3s | 10 | Tin Ore ×1 |
| Iron Rock | 15 | 3s | 30 | Iron Ore ×1 |
| Coal Rock | 30 | 3s | 50 | Coal ×1 |
| Gold Rock | 45 | 3s | 70 | Gold Ore ×1 |
| Mithril Rock | 60 | 3s | 100 | Mithril Ore ×1 |

#### Fishing

| Action | Level Req | Interval | XP | Output |
|--------|-----------|----------|----|--------|
| Shrimp | 1 | 3s | 10 | Raw Shrimp ×1 |
| Trout | 15 | 3.5s | 30 | Raw Trout ×1 |
| Salmon | 30 | 4s | 50 | Raw Salmon ×1 |
| Lobster | 45 | 4.5s | 80 | Raw Lobster ×1 |
| Swordfish | 60 | 5s | 120 | Raw Swordfish ×1 |

### Artisan Skills

#### Smithing

Two phases: smelting (ore → bars) and forging (bars → equipment).

**Smelting (3s interval):**

| Action | Level Req | XP | Input | Output |
|--------|-----------|-----|-------|--------|
| Bronze Bar | 1 | 15 | Copper Ore ×1, Tin Ore ×1 | Bronze Bar ×1 |
| Iron Bar | 15 | 35 | Iron Ore ×1, Coal ×1 | Iron Bar ×1 |
| Steel Bar | 30 | 60 | Iron Ore ×1, Coal ×2 | Steel Bar ×1 |
| Mithril Bar | 60 | 110 | Mithril Ore ×1, Coal ×3 | Mithril Bar ×1 |

**Forging (3s interval):**

Each metal tier produces a set of equipment: Sword (weapon), Helmet (head), Platebody (body), Platelegs (legs), Boots (feet). Level requirements and bar costs scale with tier:
- Bronze: Lv1, 2-5 bars per piece
- Iron: Lv15, 2-5 bars per piece
- Steel: Lv30, 2-5 bars per piece
- Mithril: Lv60, 3-6 bars per piece

**Weapon Stats by Type and Tier:**

| Weapon | Bars | Attack Speed | Strength Bonus | Accuracy Bonus |
|--------|------|-------------|----------------|----------------|
| Bronze Dagger | 2 | 2.0s | 5 | 8 |
| Bronze Sword | 3 | 2.8s | 12 | 15 |
| Bronze Battleaxe | 5 | 3.6s | 22 | 10 |
| Iron Dagger | 2 | 2.0s | 10 | 15 |
| Iron Sword | 3 | 2.8s | 22 | 28 |
| Iron Battleaxe | 5 | 3.6s | 40 | 18 |
| Steel Dagger | 2 | 2.0s | 18 | 25 |
| Steel Sword | 3 | 2.8s | 38 | 45 |
| Steel Battleaxe | 5 | 3.6s | 65 | 30 |
| Mithril Dagger | 3 | 2.0s | 30 | 40 |
| Mithril Sword | 4 | 2.8s | 60 | 70 |
| Mithril Battleaxe | 6 | 3.6s | 100 | 50 |

**Armor Stats by Tier:**

| Tier | Helmet (Defence/HP) | Platebody (Defence/HP) | Platelegs (Defence/HP) | Boots (Defence/HP) | Bars per piece |
|------|---------------------|----------------------|----------------------|--------------------|----|
| Bronze | 3/0 | 8/5 | 5/0 | 2/0 | 2/5/4/2 |
| Iron | 6/5 | 15/10 | 10/5 | 4/0 | 2/5/4/2 |
| Steel | 10/10 | 25/20 | 18/10 | 7/5 | 2/5/4/2 |
| Mithril | 16/15 | 40/30 | 28/20 | 12/10 | 3/6/5/3 |

#### Cooking

| Action | Level Req | Interval | XP | Input | Output | Base Success Rate |
|--------|-----------|----------|----|-------|--------|-------------------|
| Cooked Shrimp | 1 | 3s | 15 | Raw Shrimp ×1 | Cooked Shrimp ×1 | 70% |
| Cooked Trout | 15 | 3s | 35 | Raw Trout ×1 | Cooked Trout ×1 | 65% |
| Cooked Salmon | 30 | 3s | 55 | Raw Salmon ×1 | Cooked Salmon ×1 | 60% |
| Cooked Lobster | 45 | 3s | 80 | Raw Lobster ×1 | Cooked Lobster ×1 | 55% |
| Cooked Swordfish | 60 | 3s | 120 | Raw Swordfish ×1 | Cooked Swordfish ×1 | 50% |

Success rate increases by +1% per skill level above the requirement. On failure, the raw fish is consumed but no cooked food is produced (burnt).

### Metal Tier Progression

Bronze (Lv1) → Iron (Lv15) → Steel (Lv30) → Gold (Lv45, ore only — no equipment) → Mithril (Lv60)

## Combat System

### Auto-Attack Loop

1. Player selects a combat area
2. A monster spawns (first in the area's monster list, or random)
3. Both player and monster have independent attack timers that fill over time
4. When a timer fills → calculate hit → apply damage
5. Monster dies → roll loot table, award combat XP, 3s respawn timer → next monster
6. Player dies → combat ends, player returned to idle state, no penalty

### Player Stats

Derived from base values + equipment + town bonuses:

| Stat | Base | Source |
|------|------|--------|
| Max HP | 100 | +10 per combat level, +Barracks bonus, +equipment |
| Attack Speed | — | Determined by weapon type: Dagger 2.0s, Sword 2.8s, Battleaxe 3.6s |
| Max Hit | 1 | +weapon strength bonus + Forge town bonus |
| Min Hit | 1 | 30% of max hit |
| Accuracy | 50 | +equipment accuracy bonus + Barracks town bonus |
| Defence | 0 | +armor defence bonuses, reduces incoming damage by flat amount |

### Hit Calculation

```
hitChance = accuracy / (accuracy + monsterEvasion) * 100
if (random(100) < hitChance):
  damage = random(minHit, maxHit)
else:
  damage = 0 (miss)
```

Monster damage calculation mirrors this using monster stats vs player defence.

Incoming damage reduced by defence: `actualDamage = max(1, rawDamage - defence)`

### Food & Auto-Eat

- Player equips one food type in the food equipment slot
- Auto-eat is always active: when player HP drops below 40% of max HP, automatically consume one food item from bank
- Each food type heals a fixed amount (boosted by Kitchen town building):

| Food | Heal Amount |
|------|-------------|
| Cooked Shrimp | 30 |
| Cooked Trout | 60 |
| Cooked Salmon | 100 |
| Cooked Lobster | 150 |
| Cooked Swordfish | 220 |

- Running out of food = no more healing; player must survive on remaining HP or die

### Combat XP

Combat XP is awarded per kill: `combatXp = monster.maxHp / 4`. This scales naturally with monster difficulty.

### Combat Areas

| Area | Combat Lv Req | Monster | HP | Max Hit | Evasion | Atk Speed | Gold Drop |
|------|--------------|---------|-----|---------|---------|-----------|-----------|
| Grasslands | 1 | Chicken | 20 | 3 | 10 | 3.0s | 3-8 |
| Grasslands | 1 | Cow | 40 | 5 | 15 | 3.2s | 5-12 |
| Grasslands | 1 | Goblin | 60 | 8 | 25 | 3.0s | 8-20 |
| Forest | 10 | Wolf | 80 | 12 | 40 | 2.8s | 15-30 |
| Forest | 10 | Giant Spider | 100 | 15 | 50 | 3.0s | 20-40 |
| Forest | 10 | Bandit | 130 | 18 | 60 | 3.2s | 25-50 |
| Caves | 25 | Bat Swarm | 150 | 20 | 75 | 2.6s | 30-60 |
| Caves | 25 | Skeleton | 200 | 25 | 90 | 3.0s | 40-80 |
| Caves | 25 | Cave Troll | 300 | 30 | 100 | 3.6s | 50-100 |
| Mountains | 40 | Mountain Lion | 350 | 35 | 120 | 2.8s | 60-120 |
| Mountains | 40 | Orc Warrior | 450 | 42 | 140 | 3.2s | 80-160 |
| Mountains | 40 | Rock Golem | 600 | 50 | 170 | 3.8s | 100-200 |
| Dark Dungeon | 60 | Shadow Knight | 800 | 60 | 200 | 3.0s | 150-300 |
| Dark Dungeon | 60 | Demon | 1000 | 75 | 240 | 3.2s | 200-400 |
| Dark Dungeon | 60 | Dragon | 1500 | 100 | 300 | 3.6s | 300-500 |

Each monster also has a loot table (see below).

### Loot Tables

Each monster drops:
- **Gold:** Always. Amount scales with monster difficulty (5-500 range).
- **Resources:** Common drop. Raw materials relevant to the area (ore, logs, fish).
- **Rare equipment:** Low chance (1-5%). Harder monsters can drop equipment matching or exceeding their area's tier. Dark Dungeon has unique drops that can't be crafted.

## Town System

### Concept

A dedicated tab where players spend gathered resources and gold to upgrade buildings. Each building provides a passive bonus. Buildings have levels 1–10.

### Buildings

| Building | Cost per Level | Effect per Level |
|----------|---------------|-----------------|
| Lumber Mill | (10 × Lv × 1.5) Normal Logs + (50 × Lv × 1.5) Gold | +5% Woodcutting speed (reduces interval) |
| Mine Shaft | (10 × Lv × 1.5) Copper Ore + (50 × Lv × 1.5) Gold | +5% Mining speed |
| Fishery | (10 × Lv × 1.5) Raw Shrimp + (50 × Lv × 1.5) Gold | +5% Fishing speed |
| Forge | (5 × Lv × 1.5) Bronze Bars + (100 × Lv × 1.5) Gold | +5% Smithing speed, +2 max hit in combat |
| Kitchen | (10 × Lv × 1.5) Cooked Shrimp + (75 × Lv × 1.5) Gold | +10% cooking success rate, +5 HP healed per food |
| Barracks | (300 × Lv × 1.5) Gold | +3% accuracy, +5 max HP |
| Market | (500 × Lv × 1.5) Gold | Generates (Lv × 2) gold per minute passively |

**Cost Formula:** `baseCost × level × 1.5`, floored. Level 1 is cheap, level 10 is a significant investment.

**Town Bonuses:** Applied as multipliers/additions to the relevant systems. Speed bonuses reduce action intervals: `effectiveInterval = baseInterval / (1 + speedBonus)`.

### UI

Grid of building cards. Each card shows:
- Building name and icon
- Current level (e.g., "Lv 3 / 10")
- Current bonus summary (e.g., "+15% Woodcutting speed")
- Cost to upgrade to next level
- Upgrade button (greyed out if resources insufficient)

## Bank & Items

### Bank

A single shared inventory grid. All gathered/crafted/looted items stored here. Items stack infinitely. Unlimited slots (no slot purchasing).

### Item Categories

- **Resources:** Logs (5 types), Ore (6 types), Raw Fish (5 types), Bars (4 types), Coal
- **Food:** Cooked fish (5 types) — equippable in food slot, consumed during combat
- **Equipment:** Weapons (Dagger/Sword/Battleaxe × 4 tiers) + Armor (Helmet/Platebody/Platelegs/Boots × 4 tiers) + rare combat drops
- **Gold:** Not stored in bank — tracked as a separate counter in game state

### Equipment Slots

6 total: Weapon, Head, Body, Legs, Feet, Food

Each equipment piece has stats:
- Weapons: `attackSpeed`, `strengthBonus`, `accuracyBonus`
- Armor: `defenceBonus`, `hpBonus`

Equip/unequip from the bank view. Unequipping returns item to bank.

### Selling

Any item can be sold for gold from the bank. Sell price is a fixed value per item type (roughly 20-30% of the effort to produce it, providing a gold sink alternative to town upgrades).

## UI Structure

### Layout: Tab-based

**Top Navigation Bar:**
- 4 main tabs: Skills, Combat, Town, Bank
- Gold display on the right side of the nav bar
- Active tab highlighted

**Skills Tab:**
- Sub-tabs for each skill: Woodcutting, Mining, Fishing, Smithing, Cooking
- Skill header: skill name, current level, XP bar showing progress to next level
- Action grid: cards showing available actions. Each card has: name, level requirement, interval, input/output items. Locked actions greyed out.
- Active action: selected card highlighted, progress bar at the bottom showing timer progress

**Combat Tab:**
- Left panel: player stats summary (HP, attack speed, max hit, defence, accuracy), equipment slots, food slot with quantity
- Center: area selection (list of areas with level requirements), current monster info (name, HP bar, attack timer), player HP bar + attack timer
- Right panel: loot log (scrolling list of recent drops)

**Town Tab:**
- Grid of building cards (described above in Town System section)

**Bank Tab:**
- Item grid showing all owned items with quantities
- Click item → context panel with: item stats, Equip/Unequip button, Sell button (shows gold value), quantity owned
- Category filter tabs: All, Resources, Food, Equipment

**Persistent Footer (all tabs):**
- Shows current active action: "Mining Copper Rock..." or "Fighting Goblin..." or "Idle"
- Mini progress bar for current action timer
- Always visible so player knows what's running regardless of which tab they're viewing
