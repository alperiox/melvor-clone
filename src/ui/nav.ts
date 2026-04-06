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
