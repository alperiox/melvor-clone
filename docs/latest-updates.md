# Latest Updates & Current State

> Last updated: 2026-04-07

This document captures the current state of the project, recent decisions, known issues, and context that another developer or agent needs to continue work.

## Current State

The game is **fully playable** with all core systems implemented and working. It runs as a Tauri v2 desktop app.

### What's Implemented

| System | Status | Notes |
|--------|--------|-------|
| Woodcutting | Done | 5 tree types, Lv 1-60 |
| Mining | Done | 6 rock types, Lv 1-60 |
| Fishing | Done | 5 fish types, Lv 1-60 |
| Smithing | Done | 4 smelting recipes + 28 forging recipes, categorized by tier |
| Cooking | Done | 5 recipes with success rate mechanic |
| Combat | Done | 5 areas, 15 monsters, auto-attack with weapon speed, auto-eat, loot |
| Town | Done | 7 buildings with upgrade costs and passive bonuses |
| Bank | Done | Item grid, equip/unequip, bulk sell (1x/10x/100x/All) |
| Equipment | Done | 6 slots (weapon, head, body, legs, feet, food) |
| Save/Load | Done | Auto-save every 30s, save on close, Rust backend |
| Offline Progress | Done | Up to 24h for skills + market gold, combat paused offline |
| XP System | Done | Melvor-style exponential curve, level cap 99 |
| Notifications | Done | Toast notifications for actions, level-ups, warnings |
| UI | Done | Tab-based layout with Skills, Combat, Town, Bank tabs |

### Test Coverage

- **45 unit tests** across 5 test files (xp, bank, skills, combat, town)
- All passing as of latest commit
- Run: `npm test`

## Architecture Decisions

### Rendering Pattern: Build-Once + Update-Per-Tick

**Critical context for anyone modifying UI views.**

The initial implementation used `container.innerHTML = html` every ~100ms (10fps render loop). This destroyed all DOM elements each frame, causing:
- Click events getting swallowed
- CSS `:hover` states lost (flickering)
- CSS transitions unable to animate

**Current pattern:** Each view (skills, combat, town, bank) splits rendering into:
1. **`buildDOM()`** — Full innerHTML rebuild. Called only on state transitions (tab switch, level up, combat start/stop, building upgrade).
2. **`updateDynamic()`** — Updates individual DOM element properties (text content, style.width, classList). Called every tick (~10fps).
3. **`invalidate()`** — Forces a full rebuild on next tick. Called from `main.ts` on `onUIChange`.

Event handlers use **delegation** (one `container.onclick` handler) rather than per-element `addEventListener`, so they survive across ticks without re-attachment.

**If you add a new view or modify an existing one, follow this pattern.** Never do `innerHTML` inside the tick-rate update path.

### Food Equipping Is Special

Food uses a "marker" system different from regular equipment:
- `state.equipment.food` just records which food TYPE to eat
- Food items stay in the bank — they are NOT removed when "equipped"
- Combat auto-eat consumes from bank directly: `state.bank[foodId] -= 1`
- Equipping food: `state.equipment.food = itemId` (no bank movement)
- Unequipping food: `state.equipment.food = null` (no bank movement)

Regular equipment (weapons, armor) uses the standard `equip()`/`unequip()` functions in `src/game/equipment.ts` which move items between bank and equipment slots.

### All Game Logic in TypeScript

Rust backend handles ONLY `save_game` and `load_game` IPC commands. All game logic (XP, combat, skills, town, bank) runs in TypeScript. This was a deliberate choice for fast iteration on balance changes.

### Save Migration

`loadGame()` in `src/game/storage.ts` merges loaded JSON with `createInitialState()` defaults. This means adding new fields to `GameState` won't break existing saves — they'll get default values.

## Key Files

| File | Purpose |
|------|---------|
| `src/game/types.ts` | All type definitions — start here to understand data shapes |
| `src/game/state.ts` | `createInitialState()` and `formatNumber()` |
| `src/game/engine.ts` | `GameEngine` class — RAF loop, dispatches to skill/combat/town per tick |
| `src/data/items.ts` | 63 item definitions with stats and sell prices |
| `src/data/skills.ts` | 60 skill action definitions |
| `src/data/monsters.ts` | 15 monsters + 5 combat areas |
| `src/data/buildings.ts` | 7 town building definitions |
| `src/main.ts` | Entry point — wires engine, UI, notifications, save/load |
| `src/ui/router.ts` | UI state (active tab, skill sub-tab, bank filter, selection) |

## Recent Changes (Post-Initial Implementation)

### Rendering Bug Fix (commit `37b70b7`, `cdd1d6f`)
- Rewrote all 4 views to use build-once + update-per-tick pattern
- Added event delegation instead of per-element listeners
- Fixed: action switching, hover flickering, progress bar smoothness

### Notifications System (commit `37b70b7`)
- `src/ui/notifications.ts` — toast notifications with slide-in animation
- Shows: item gains from skills, level-ups, material warnings, death
- Capped at 5 simultaneous toasts, 3s auto-dismiss

### XP Detail & Time Estimate (commit `37b70b7`)
- Skills view shows XP remaining to next level
- When an action is active, shows estimated time to level up

### Sell Quantities (commit `9620264`)
- Bank context panel has 1x/10x/100x/All sell buttons
- Notifications show total gold earned from bulk sells

### Monster Stats (commit `9620264`)
- Combat area cards show each monster's HP, Max Hit, Evasion, Attack Speed
- Active combat shows current monster's stats below its name

### Smithing Categories (commit `9620264`)
- Smithing actions grouped under headers: Smelting, Bronze, Iron, Steel, Mithril

## Known Issues / Missing Features

### Not Yet Implemented
- **Dungeon mode** — The spec mentions dungeons but only combat areas are implemented
- **Mastery system** — Melvor's secondary XP track per recipe (deferred)
- **Shop** — No in-game shop for purchasing upgrades with gold (only town buildings)
- **Achievement/completion tracking** — No progress tracking beyond skill levels
- **Sound effects / music** — No audio
- **Settings page** — No settings UI (save is automatic)

### Known UX Issues
- Combat view rebuilds DOM on every loot log entry (could be optimized to append-only)
- No confirmation dialog for selling "All" of a valuable item
- No keyboard shortcuts
- Window is fixed at 1100x750 (not resizable-aware)
- No dark/light theme toggle (dark only)

## Design Documents

- **Spec:** `docs/superpowers/specs/2026-04-06-melvor-clone-design.md` — Full game design with all data tables
- **Plan:** `docs/superpowers/plans/2026-04-06-melvor-clone.md` — 15-task implementation plan with complete code
