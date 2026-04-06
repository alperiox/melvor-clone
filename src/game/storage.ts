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
