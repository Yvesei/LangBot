import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';

import { getSupabaseBrowserClient } from '@/lib/auth/client';
import { accountDetails } from '@/lib/auth/account';

interface SettingsAccountSectionProps {
  user: User;
}

export function SettingsAccountSection(props: SettingsAccountSectionProps) {
  const { name, email, avatarUrl, initial } = accountDetails(props.user);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError('Sign-out is not available. Please reload and try again.');
      return;
    }

    setError(null);
    setIsSigningOut(true);

    try {
      const { error: authError } = await client.auth.signOut();
      if (authError) {
        throw authError;
      }

      window.location.assign('/');
    } catch {
      setError('Could not sign out. Please try again.');
      setIsSigningOut(false);
    }
  }

  return (
    <section className="settings-section">
      <h3 className="settings-section-label">Account</h3>
      <div className="settings-account-row">
        <span className="settings-figure">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </span>
        <div className="settings-account-identity">
          <p className="settings-account-name">{name}</p>
          <p className="settings-account-email">{email}</p>
        </div>
      </div>
      <button
        type="button"
        className="settings-signout"
        onClick={() => void signOut()}
        disabled={isSigningOut}
        aria-busy={isSigningOut}
      >
        <LogOut size={15} />
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p
          className="settings-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}
