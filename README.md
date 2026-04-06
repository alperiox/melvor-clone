# Melvor Clone

A minimal idle RPG inspired by [Melvor Idle](https://melvoridle.com/), built as a desktop app with **Tauri v2** and **TypeScript**.

## Features

- **5 Skills** — Woodcutting, Mining, Fishing, Smithing, Cooking with timer-based actions and XP progression
- **Auto-Attack Combat** — 5 areas with 15 monsters, weapon-dependent attack speed, auto-eat food system, loot drops
- **Town Buildings** — 7 upgradeable buildings that boost skill speed, combat stats, cooking success, and passive gold income
- **Bank & Equipment** — Shared inventory with equip/sell, bulk sell (1x/10x/100x/All), 6 equipment slots
- **Offline Progress** — Skill actions continue while you're away (up to 24 hours)
- **Save/Load** — Auto-saves every 30 seconds, persisted to disk via Tauri

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Tauri v2 |
| Frontend | TypeScript + Vite (vanilla DOM, no framework) |
| Backend | Rust (save/load only) |
| Tests | Vitest (45 unit tests) |

All game logic runs in TypeScript. Rust handles only file persistence.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable)

### Install & Run

```bash
npm install
npm run tauri dev
```

### Run Tests

```bash
npm test
```

## Project Structure

```
src/
  data/           # Game data definitions (items, skills, monsters, buildings)
  game/           # Core game logic (XP, bank, equipment, skills, combat, town, engine)
  ui/             # UI rendering (router, nav, views for each tab)
  tests/          # Unit tests
  main.ts         # Entry point
  styles.css      # Game theme
src-tauri/        # Rust backend (save/load)
docs/             # Design spec and implementation plan
```

## Skills

| Skill | Type | Actions |
|-------|------|---------|
| Woodcutting | Gathering | Normal, Oak, Willow, Maple, Yew trees |
| Mining | Gathering | Copper, Tin, Iron, Coal, Gold, Mithril rocks |
| Fishing | Gathering | Shrimp, Trout, Salmon, Lobster, Swordfish |
| Smithing | Artisan | Smelt ore into bars, forge weapons and armor (Bronze through Mithril) |
| Cooking | Artisan | Cook raw fish into food for combat healing |

## Combat

Pick a combat area and your character auto-attacks monsters on a timer. Weapon type determines attack speed (daggers are fast, battleaxes are slow but powerful). Monsters drop gold, resources, and rare equipment. Food is consumed automatically when HP drops below 40%.

## Town

Spend gathered resources and gold to upgrade buildings:

- **Lumber Mill / Mine Shaft / Fishery** — Skill speed boosts
- **Forge** — Smithing speed + combat damage
- **Kitchen** — Cooking success rate + food healing
- **Barracks** — Combat accuracy + max HP
- **Market** — Passive gold income

## License

MIT
