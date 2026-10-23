import type { User } from '@supabase/supabase-js';

function displayText(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

// Derives the display identity shown for a signed-in learner.
export function accountDetails(user: User) {
  const email = displayText(user.email) ?? '';
  const name =
    displayText(user.user_metadata?.full_name) ??
    displayText(user.user_metadata?.name) ??
    (email || 'Account');

  return {
    name,
    email,
    avatarUrl: displayText(user.user_metadata?.avatar_url),
    initial: Array.from(name)[0].toUpperCase(),
  };
}
