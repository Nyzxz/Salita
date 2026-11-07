import { createHash } from 'node:crypto';
import { LoginThrottle } from '../models/LoginThrottle.js';

/**
 * Per-network throttle on failed sign-ins, stored in MongoDB so it works across
 * stateless Vercel instances. The limit is deliberately generous (a whole
 * classroom can share one school IP) — it stops scripted guessing and
 * mass-lockout attacks, not a few typos.
 */
export const MAX_FAILURES_PER_IP = 30;
export const IP_WINDOW_MINUTES = 15;

function keyFor(ip: string): string {
  return createHash('sha256').update(`login:${ip}`).digest('hex');
}

/** Best-effort client address from forwarding headers (Vercel sets these itself, so they can't be spoofed there). */
export function clientIpFrom(
  headers: Record<string, string | string[] | undefined>,
  fallback?: string,
): string | undefined {
  const pick = (value: string | string[] | undefined): string | undefined =>
    (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim() || undefined;
  return pick(headers['x-vercel-forwarded-for']) ?? pick(headers['x-forwarded-for']) ?? fallback;
}

/** Seconds until this address may try again, or 0 when it is not throttled. */
export async function throttleSecondsLeft(ip: string | undefined, now = Date.now()): Promise<number> {
  if (!ip) return 0;
  const record = await LoginThrottle.findOne({ key: keyFor(ip) }).lean();
  if (!record || record.expireAt.getTime() <= now || record.failures < MAX_FAILURES_PER_IP) return 0;
  return Math.ceil((record.expireAt.getTime() - now) / 1000);
}

export async function recordIpFailure(ip: string | undefined, now = Date.now()): Promise<void> {
  if (!ip) return;
  const key = keyFor(ip);
  // An expired window may linger until the TTL monitor runs; start a fresh one.
  await LoginThrottle.deleteOne({ key, expireAt: { $lte: new Date(now) } });
  await LoginThrottle.updateOne(
    { key },
    {
      $inc: { failures: 1 },
      $setOnInsert: { key, expireAt: new Date(now + IP_WINDOW_MINUTES * 60_000) },
    },
    { upsert: true },
  ).catch((error: unknown) => {
    // A concurrent first failure can race on the unique key; the other writer already counted.
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
  });
}
