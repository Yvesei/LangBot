'use client';

import { useEffect, useState } from 'react';

import { SettingsDialog } from '@/components/ui/settings/SettingsDialog';
import { accountDetails } from '@/lib/auth/account';
import { getSupabaseBrowserClient, useAuthSession } from '@/lib/auth/client';
import { SignInButton } from './SignInButton';

// Optional account entry point: guests get the Google sign-in button; signed-in
// users get an avatar that opens the settings dialog. Renders nothing when
// Supabase auth is not configured.

export function AuthMenu() {
  const client = getSupabaseBrowserClient();
  const { session, isLoading } = useAuthSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const user = session?.user;

  useEffect(() => {
    setSettingsOpen(false);
  }, [user?.id]);

  if (!client || isLoading) {
    return null;
  }

  if (!user) {
    return <SignInButton />;
  }

  const { avatarUrl, initial } = accountDetails(user);

  return (
    <>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="icon-button rounded-full"
        aria-label="Account"
        aria-haspopup="dialog"
        title="Settings"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={22}
            height={22}
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </button>
      {settingsOpen && (
        <SettingsDialog
          user={user}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}
