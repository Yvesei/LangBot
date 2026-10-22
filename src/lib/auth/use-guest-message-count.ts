import { useEffect, useRef, useState } from 'react';
import {
  GUEST_MESSAGE_COUNT_STORAGE_KEY,
  loadGuestMessageCount,
  saveGuestMessageCount,
} from './guest-message-limit';

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
