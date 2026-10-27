import { useEffect, useRef, useState } from 'react';

export const DEFAULT_GUEST_MESSAGE_LIMIT = 5;
export const GUEST_MESSAGE_COUNT_STORAGE_KEY = 'languify:guest-message-count';

export function loadGuestMessageCount() {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const value = Number(window.localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveGuestMessageCount(count: number) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(GUEST_MESSAGE_COUNT_STORAGE_KEY, String(count));
  } catch {
    // Keep the allowance for this visit when browser storage is unavailable.
  }
}

export function useGuestMessageCount() {
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const count = useRef(0);

  useEffect(() => {
    function syncCount() {
      count.current = loadGuestMessageCount();
      setGuestMessageCount(count.current);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key === GUEST_MESSAGE_COUNT_STORAGE_KEY) {
        syncCount();
      }
    }

    syncCount();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function recordGuestMessage() {
    count.current = Math.max(count.current, loadGuestMessageCount()) + 1;
    saveGuestMessageCount(count.current);
    setGuestMessageCount(count.current);
    return count.current;
  }

  return {
    guestMessageCount,
    recordGuestMessage,
  };
}
