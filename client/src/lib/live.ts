import { useEffect, useRef } from 'react';

/**
 * Live updates over server-sent events. The server tells us when something new
 * happened for this user (a grade, new content, a submission); screens refresh
 * when it does. If the stream is down, screens fall back to their normal polling.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let source: EventSource | null = null;
let connected = false;

/** True while the stream is open, so polling can slow down. */
export function isLiveConnected(): boolean {
  return connected;
}

export function startLive(): void {
  if (source || typeof EventSource === 'undefined') return;
  const next = new EventSource('/api/auth/me?action=events', { withCredentials: true });
  source = next;
  next.addEventListener('ready', () => {
    connected = true;
  });
  next.addEventListener('update', () => {
    listeners.forEach((listener) => listener());
  });
  // The browser reconnects by itself; until it does, polling takes over.
  next.onerror = () => {
    connected = false;
  };
}

export function stopLive(): void {
  source?.close();
  source = null;
  connected = false;
}

export function onLive(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Runs `refresh` whenever the server reports something new. */
export function useLiveRefresh(refresh: () => void, enabled = true): void {
  const ref = useRef(refresh);
  ref.current = refresh;
  useEffect(() => {
    if (!enabled) return undefined;
    return onLive(() => ref.current());
  }, [enabled]);
}

/**
 * Wraps a polling tick: while the live stream is connected, only one tick in
 * `every` actually runs (a safety net); otherwise every tick runs.
 */
export function throttledWhenLive(tick: () => void, every = 6): () => void {
  let count = 0;
  return () => {
    count += 1;
    if (isLiveConnected() && count % every !== 0) return;
    tick();
  };
}
