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
