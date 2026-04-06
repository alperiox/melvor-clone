import { GameEngine } from "./game/engine";
import { loadGame, saveGame, startAutoSave } from "./game/storage";
import { calculateOfflineProgress } from "./game/offline";
import { formatNumber } from "./game/state";
import { initNav, updateNav } from "./ui/nav";
import { updateFooter } from "./ui/footer";
import { renderSkillsView, invalidateSkillsView } from "./ui/skills-view";
import { renderCombatView, addLootLogEntry, invalidateCombatView } from "./ui/combat-view";
import { renderTownView, invalidateTownView } from "./ui/town-view";
import { renderBankView, invalidateBankView } from "./ui/bank-view";
import { getUIState, onUIChange } from "./ui/router";
import { getItem } from "./data/items";
import { getSkillAction } from "./data/skills";
import { showNotification } from "./ui/notifications";

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

  const skillsPanel = document.getElementById("tab-skills")!;
  const combatPanel = document.getElementById("tab-combat")!;
  const townPanel = document.getElementById("tab-town")!;
  const bankPanel = document.getElementById("tab-bank")!;

  // Full re-render function
  function renderAll() {
    const ui = getUIState();
    updateNav(state);
    updateFooter(state);

    if (ui.activeTab === "skills") renderSkillsView(state, skillsPanel);
    if (ui.activeTab === "combat") renderCombatView(state, combatPanel);
    if (ui.activeTab === "town") renderTownView(state, townPanel);
    if (ui.activeTab === "bank") renderBankView(state, bankPanel);
  }

  // Re-render on UI state changes (tab switches)
  onUIChange(() => {
    invalidateSkillsView();
    invalidateCombatView();
    invalidateTownView();
    invalidateBankView();
    renderAll();
  });

  // Track previous level for level-up notifications
  const prevLevels: Record<string, number> = {};
  for (const [sid, s] of Object.entries(state.skills)) {
    prevLevels[sid] = s.level;
  }

  // Throttled render
  let renderAccum = 0;
  engine.onTick((_state, result, dt) => {
    // Skill action notifications
    if (result.skillResult && result.skillResult.actionsCompleted > 0 && state.activeAction?.actionId) {
      const action = getSkillAction(state.activeAction.actionId);
      const outputNames = Object.entries(action.outputs).map(([id, qty]) =>
        `${qty * result.skillResult!.successfulActions} ${getItem(id).name}`
      ).join(", ");
      if (outputNames && result.skillResult.successfulActions > 0) {
        showNotification(`+${outputNames}  (+${result.skillResult.xpGained} XP)`, "success");
      }
    }
    if (result.skillResult?.stoppedNoMaterials) {
      showNotification("Ran out of materials!", "warning");
    }

    // Level-up notifications
    for (const [sid, s] of Object.entries(state.skills)) {
      if (s.level > (prevLevels[sid] ?? 0)) {
        const name = sid.charAt(0).toUpperCase() + sid.slice(1);
        showNotification(`${name} leveled up to ${s.level}!`, "success");
        prevLevels[sid] = s.level;
      }
    }

    // Combat loot log
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
      showNotification("You died!", "warning");
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
