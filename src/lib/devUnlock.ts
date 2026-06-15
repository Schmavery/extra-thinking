/** Dev-only: reveal debug UI after a rapid-click challenge (session-persisted). */

const STORAGE_KEY = 'extra_thinking_dev_unlock';
const CLICKS_REQUIRED = 7;
const WINDOW_MS = 4000;

type Listener = () => void;
const listeners = new Set<Listener>();

let clickCount = 0;
let windowStart = 0;

export function isDevUnlockAllowed(): boolean {
  return import.meta.env.DEV;
}

export function isDevUnlocked(): boolean {
  if (!isDevUnlockAllowed()) return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

function persistUnlock(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode / quota */
  }
  notifyListeners();
}

export function clearDevUnlock(): void {
  if (!isDevUnlockAllowed()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
  clickCount = 0;
  windowStart = 0;
  notifyListeners();
}

export function subscribeDevUnlock(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Register one secret click; returns true if this click completed the challenge. */
export function registerDevUnlockClick(): boolean {
  if (!isDevUnlockAllowed()) return false;
  if (isDevUnlocked()) return false;

  const now = Date.now();
  if (clickCount === 0 || now - windowStart > WINDOW_MS) {
    clickCount = 1;
    windowStart = now;
    return false;
  }

  clickCount += 1;
  if (clickCount >= CLICKS_REQUIRED) {
    persistUnlock();
    clickCount = 0;
    return true;
  }
  return false;
}
