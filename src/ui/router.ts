export type MainTab = "skills" | "combat" | "town" | "bank";
export type SkillSubTab = "woodcutting" | "mining" | "fishing" | "smithing" | "cooking";
export type BankFilter = "all" | "resource" | "food" | "equipment";

export interface UIState {
  activeTab: MainTab;
  activeSkill: SkillSubTab;
  bankFilter: BankFilter;
  selectedBankItem: string | null;
}

let uiState: UIState = {
  activeTab: "skills",
  activeSkill: "woodcutting",
  bankFilter: "all",
  selectedBankItem: null,
};

type Listener = () => void;
const listeners: Listener[] = [];

export function getUIState(): UIState {
  return uiState;
}

export function onUIChange(fn: Listener): void {
  listeners.push(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function switchTab(tab: MainTab): void {
  uiState.activeTab = tab;
  uiState.selectedBankItem = null;
  notify();
}

export function switchSkill(skill: SkillSubTab): void {
  uiState.activeSkill = skill;
  notify();
}

export function setBankFilter(filter: BankFilter): void {
  uiState.bankFilter = filter;
  uiState.selectedBankItem = null;
  notify();
}

export function selectBankItem(itemId: string | null): void {
  uiState.selectedBankItem = itemId;
  notify();
}
