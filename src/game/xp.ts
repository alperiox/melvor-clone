const MAX_LEVEL = 99;

// XP_TABLE[L] = cumulative XP required to reach level L
// Level 1 requires 0 XP
const XP_TABLE: number[] = new Array(MAX_LEVEL + 1).fill(0);

function buildXpTable(): void {
  let total = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    const diff = Math.floor(0.25 * (level + 300 * Math.pow(2, level / 7)));
    total += diff;
    XP_TABLE[level + 1] = total; // XP_TABLE[level+1] = total XP for level+1
  }
}
buildXpTable();

/** Total cumulative XP required to reach a given level. Level 1 = 0. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return XP_TABLE[MAX_LEVEL] ?? 0;
  return XP_TABLE[level] ?? 0;
}

/** Given cumulative XP, return the current level (1-99). */
export function levelForXp(xp: number): number {
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (xp >= xpForLevel(level)) return level;
  }
  return 1;
}

/** XP remaining from current XP to reach the next level. Returns 0 at max. */
export function xpToNextLevel(level: number, currentXp: number): number {
  if (level >= MAX_LEVEL) return 0;
  return xpForLevel(level + 1) - currentXp;
}

/** XP progress fraction (0-1) within the current level. */
export function xpProgress(level: number, currentXp: number): number {
  if (level >= MAX_LEVEL) return 1;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const range = next - current;
  if (range <= 0) return 1;
  return (currentXp - current) / range;
}
