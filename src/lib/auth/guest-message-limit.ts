export const DEFAULT_GUEST_MESSAGE_LIMIT = 5;
export const GUEST_MESSAGE_COUNT_STORAGE_KEY = 'languify:guest-message-count';

function getConfiguredGuestMessageLimit() {
  const configuredLimit = process.env.NEXT_PUBLIC_GUEST_MESSAGE_LIMIT?.trim();
  if (!configuredLimit) {
    return DEFAULT_GUEST_MESSAGE_LIMIT;
  }

  const limit = Number(configuredLimit);
  return Number.isSafeInteger(limit) && limit >= 0 ? limit : DEFAULT_GUEST_MESSAGE_LIMIT;
}

export const GUEST_MESSAGE_LIMIT = getConfiguredGuestMessageLimit();

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
