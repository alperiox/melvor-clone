import { invoke } from "@tauri-apps/api/core";
import { GameState, createInitialState } from "./state";

const SAVE_INTERVAL_MS = 30_000; // auto-save every 30 seconds

export async function saveGame(state: GameState): Promise<void> {
  state.stats.lastSavedAt = Date.now();
  const json = JSON.stringify(state);
  await invoke("save_game", { data: json });
}

export async function loadGame(): Promise<GameState> {
  try {
    const json = await invoke<string>("load_game");
    const loaded = JSON.parse(json) as GameState;
    return loaded;
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
