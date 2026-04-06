import { GameEngine } from "./game/engine";
import { Renderer } from "./game/renderer";
import { loadGame, saveGame, startAutoSave } from "./game/storage";
import { formatNumber } from "./game/state";

async function init() {
  // Load saved state or create fresh
  const state = await loadGame();
  const engine = new GameEngine(state);

  // Calculate offline progress
  const offlineEarned = engine.applyOfflineProgress();

  const renderer = new Renderer();

  // Show offline earnings if any
  if (offlineEarned > 0) {
    const offlineEl = document.getElementById("offline-banner")!;
    offlineEl.textContent = `Welcome back! You earned ${formatNumber(offlineEarned)} while away.`;
    offlineEl.classList.add("visible");
    setTimeout(() => offlineEl.classList.remove("visible"), 4000);
  }

  // Wire click handler
  const clickTarget = document.getElementById("click-target")!;
  clickTarget.addEventListener("click", () => {
    engine.click();
    // Quick visual feedback
    clickTarget.classList.add("clicked");
    setTimeout(() => clickTarget.classList.remove("clicked"), 100);
  });

  // Render every frame
  engine.onTick((s) => renderer.update(s, engine));

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
