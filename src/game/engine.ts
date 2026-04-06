import { GameState } from "./types";
import { processSkillTick, SkillTickResult } from "./skills";
import { processCombatTick, CombatTickResult } from "./combat";
import { getTownBonuses } from "./town";

export type EngineTickResult = {
  skillResult: SkillTickResult | null;
  combatResult: CombatTickResult | null;
  passiveGoldEarned: number;
};

export type TickCallback = (state: GameState, result: EngineTickResult, dt: number) => void;

export class GameEngine {
  state: GameState;
  private lastTick: number;
  private running = false;
  private tickCallbacks: TickCallback[] = [];
  private rafId: number | null = null;

  constructor(state: GameState) {
    this.state = state;
    this.lastTick = Date.now();
  }

  onTick(cb: TickCallback): void {
    this.tickCallbacks.push(cb);
  }

  start(): void {
    this.running = true;
    this.lastTick = Date.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(dt: number): EngineTickResult {
    const result: EngineTickResult = { skillResult: null, combatResult: null, passiveGoldEarned: 0 };

    // Process active action
    if (this.state.activeAction) {
      if (this.state.activeAction.type === "skill") {
        result.skillResult = processSkillTick(this.state, dt);
      } else if (this.state.activeAction.type === "combat") {
        result.combatResult = processCombatTick(this.state, dt);
      }
    }

    // Town passive gold (Market)
    const bonuses = getTownBonuses(this.state);
    if (bonuses.passiveGoldPerMinute > 0) {
      const goldPerSecond = bonuses.passiveGoldPerMinute / 60;
      const earned = goldPerSecond * dt;
      this.state.gold += earned;
      result.passiveGoldEarned = earned;
    }

    return result;
  }

  private loop(): void {
    if (!this.running) return;

    const now = Date.now();
    const dt = Math.min((now - this.lastTick) / 1000, 1); // cap at 1s per frame to avoid huge jumps
    this.lastTick = now;

    const result = this.tick(dt);

    for (const cb of this.tickCallbacks) {
      cb(this.state, result, dt);
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
