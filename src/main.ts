// Main entry point — will be fully wired in Task 15 (Main Entry + Integration)
import { loadGame, saveGame, startAutoSave } from "./game/storage";
import { calculateOfflineProgress } from "./game/offline";
import { GameEngine } from "./game/engine";
import { formatNumber } from "./game/state";

async function init() {
  // Load saved state or create fresh
  const state = await loadGame();

  // Calculate offline progress
  const offlineResult = calculateOfflineProgress(state);

  const engine = new GameEngine(state);

  // Show offline earnings if any
  if (offlineResult.elapsedSeconds > 1) {
    const offlineEl = document.getElementById("offline-banner");
    if (offlineEl) {
      offlineEl.textContent = `Welcome back! You earned ${formatNumber(offlineResult.goldGained)} GP and completed ${offlineResult.skillActionsCompleted} actions while away.`;
      offlineEl.classList.add("visible");
      setTimeout(() => offlineEl.classList.remove("visible"), 4000);
    }
  }

  // Auto-save
  const stopAutoSave = startAutoSave(() => engine.state);

  // Save on close
  window.addEventListener("beforeunload", () => {
    stopAutoSave();
    saveGame(engine.state);
  });

  // Start the game loop
  engine.start();
}

window.addEventListener("DOMContentLoaded", init);
