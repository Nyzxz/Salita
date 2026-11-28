/** Learning XP is a motivational counter kept in this browser. It never changes grades. */
const key = (userId: string) => `salita.xp.${userId}`;

export function getXp(userId: string): number {
  try {
    return Math.max(0, Number(window.localStorage.getItem(key(userId))) || 0);
  } catch {
    return 0;
  }
}

export function addXp(userId: string, amount: number): number {
  const total = getXp(userId) + Math.max(0, Math.round(amount));
  try {
    window.localStorage.setItem(key(userId), String(total));
  } catch {
    /* storage unavailable */
  }
  return total;
}

const LEVEL_SIZE = 250;

/** One level per 250 XP, with progress through the current level. */
export function levelFor(xp: number): { level: number; into: number; size: number } {
  return { level: Math.floor(xp / LEVEL_SIZE) + 1, into: xp % LEVEL_SIZE, size: LEVEL_SIZE };
}
