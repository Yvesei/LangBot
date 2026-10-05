export function getRetryDelay(retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }

    const retryDate = Date.parse(retryAfter);

    if (Number.isFinite(retryDate)) {
      return Math.max(0, retryDate - Date.now());
    }
  }

  return 700 + Math.random() * 300;
}

export function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();

    function handleAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }

    function handleTimeout() {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }

    const timer = setTimeout(handleTimeout, Math.max(0, delay));
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}
