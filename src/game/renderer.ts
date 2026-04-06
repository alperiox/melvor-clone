import { GameState, formatNumber } from "./state";
import { GameEngine } from "./engine";

export class Renderer {
  private resourceEl: HTMLElement;
  private perSecEl: HTMLElement;
  private clickCountEl: HTMLElement;

  constructor() {
    this.resourceEl = document.getElementById("resource-count")!;
    this.perSecEl = document.getElementById("per-second")!;
    this.clickCountEl = document.getElementById("click-count")!;
  }

  update(state: GameState, engine: GameEngine): void {
    this.resourceEl.textContent = formatNumber(state.resources.main);
    this.perSecEl.textContent = `${formatNumber(engine.getPassiveIncome())}/sec`;
    this.clickCountEl.textContent = formatNumber(state.stats.totalClicks);
  }
}
