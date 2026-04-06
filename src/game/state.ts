export interface GameState {
  /** Primary currency and any additional resources */
  resources: Record<string, number>;
  /** Upgrade IDs mapped to their current level */
  upgrades: Record<string, number>;
  /** Lifetime stats for display and achievements */
  stats: {
    totalClicks: number;
    totalEarned: number;
    startedAt: number;
    lastSavedAt: number;
  };
}

export function createInitialState(): GameState {
  return {
    resources: { main: 0 },
    upgrades: {},
    stats: {
      totalClicks: 0,
      totalEarned: 0,
      startedAt: Date.now(),
      lastSavedAt: Date.now(),
    },
  };
}

export function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1) + "M";
  return (n / 1_000_000_000).toFixed(1) + "B";
}
