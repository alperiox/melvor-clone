import { GameState } from "./state";

export type TickCallback = (state: GameState, dt: number) => void;

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

  /** Register a callback that fires every frame with (state, deltaSeconds) */
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

  /** Core tick: accumulate passive income */
  tick(dt: number): void {
    const perSecond = this.getPassiveIncome();
    const earned = perSecond * dt;
    this.state.resources.main += earned;
    this.state.stats.totalEarned += earned;
  }

  /** Handle a click on the main target */
  click(): void {
    const power = this.getClickPower();
    this.state.resources.main += power;
    this.state.stats.totalClicks++;
    this.state.stats.totalEarned += power;
  }

  /** Calculate offline progress and apply it */
  applyOfflineProgress(): number {
    const now = Date.now();
    const elapsed = (now - this.state.stats.lastSavedAt) / 1000;
    if (elapsed > 1) {
      const earned = this.getPassiveIncome() * elapsed;
      this.state.resources.main += earned;
      this.state.stats.totalEarned += earned;
      return earned;
    }
    return 0;
  }

  /** Override these in your game to customize progression */
  getClickPower(): number {
    return 1;
  }

  getPassiveIncome(): number {
    // Each upgrade level contributes 1/sec — customize this for your game
    return Object.values(this.state.upgrades).reduce(
      (sum, level) => sum + level,
      0
    );
  }

  private loop(): void {
    if (!this.running) return;

    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    this.tick(dt);

    for (const cb of this.tickCallbacks) {
      cb(this.state, dt);
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
