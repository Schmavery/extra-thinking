type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export function setDebugToastListener(fn: ToastListener | null): void {
  listener = fn;
}

/** Save/lifecycle toasts disabled for now; call sites kept for easy re-enable. */
export function debugToast(_message: string): void {}
