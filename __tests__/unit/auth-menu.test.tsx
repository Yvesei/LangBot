/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { AuthMenu } from '@/components/ui/chat/header/AuthMenu';
import { SignInButton } from '@/components/ui/chat/header/SignInButton';

jest.mock('@/lib/auth/config', () => ({ isSupabaseConfigured: () => true }));

const authApi = {
  getSession: jest.fn(),
  signInWithOAuth: jest.fn(),
  signOut: jest.fn(),
  listener: null as null | ((event: string, session: unknown) => void),
};

jest.mock('@/lib/auth/browser', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: authApi.getSession,

      onAuthStateChange: (handler: (event: string, session: unknown) => void) => {
        authApi.listener = handler;
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
      signInWithOAuth: authApi.signInWithOAuth,
      signOut: authApi.signOut,
    },
  }),
}));

const account = {
  id: 'user-1',
  email: 'john@doe.com',
  user_metadata: { full_name: 'John Doe', avatar_url: '' },
};

afterEach(() => {
  authApi.getSession.mockReset();
  authApi.signInWithOAuth.mockReset();
  authApi.signOut.mockReset();
  authApi.listener = null;
  window.history.replaceState(null, '', '/');
});

async function openSettings() {
  authApi.getSession.mockResolvedValue({ data: { session: { user: account } } });

  render(<AuthMenu />);

  const trigger = await screen.findByRole('button', { name: 'Account' });
  trigger.focus();
  fireEvent.click(trigger);

  return screen.getByRole('dialog', { name: 'Settings' });
}

test('offers Google sign-in while signed out', async () => {
  authApi.getSession.mockResolvedValue({ data: { session: null } });

  render(<AuthMenu />);

  expect(
    await screen.findByRole('button', { name: 'Sign in with Google' }),
  ).toBeInTheDocument();
});

test('shows a sign-in error when Supabase rejects the request', async () => {
  authApi.getSession.mockResolvedValue({ data: { session: null } });
  authApi.signInWithOAuth.mockResolvedValue({ error: new Error('Provider disabled') });

  render(<AuthMenu />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not start Google sign-in.',
  );
});

test('uses the callback URL when starting Google sign-in', async () => {
  authApi.getSession.mockResolvedValue({ data: { session: null } });
  authApi.signInWithOAuth.mockResolvedValue({ error: null });

  render(<AuthMenu />);
  const button = await screen.findByRole('button', { name: 'Sign in with Google' });
  fireEvent.click(button);

  expect(authApi.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  expect(button).toBeDisabled();
  await act(async () => undefined);

  fireEvent(window, new PageTransitionEvent('pageshow', { persisted: true }));
  expect(button).toBeEnabled();
});

test('shows callback failures until retry and removes only the error parameter', async () => {
  window.history.replaceState(null, '', '/?auth_error=1&other=value#chat');
  authApi.getSession.mockResolvedValue({ data: { session: null } });
  authApi.signInWithOAuth.mockResolvedValue({ error: null });

  render(<AuthMenu />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Google sign-in did not finish.',
  );
  expect(window.location.search).toBe('?auth_error=1&other=value');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
  await act(async () => undefined);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(window.location.search).toBe('?other=value');
  expect(window.location.hash).toBe('#chat');
});

test('shows the callback failure in both sign-in entry points', () => {
  window.history.replaceState(null, '', '/?auth_error=1');

  render(
    <>
      <SignInButton />
      <SignInButton variant="call-to-action" />
    </>,
  );

  const alerts = screen.getAllByRole('alert');
  expect(alerts).toHaveLength(2);
  alerts.forEach((alert) =>
    expect(alert).toHaveTextContent('Google sign-in did not finish.'),
  );
});

test('the avatar opens settings with account details', async () => {
  const dialog = await openSettings();

  expect(within(dialog).getByText('John Doe')).toBeInTheDocument();
  expect(within(dialog).getByText('john@doe.com')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: /sign out/i })).toBeInTheDocument();
});

test('the close button dismisses the settings dialog', async () => {
  await openSettings();

  fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

  expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Account' })).toHaveFocus();
});

test('signing out in another tab closes settings before signing in again', async () => {
  await openSettings();

  act(() => authApi.listener?.('SIGNED_OUT', null));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  act(() => authApi.listener?.('SIGNED_IN', { user: account }));
  expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('falls back to the email when provider metadata contains invalid names', async () => {
  authApi.getSession.mockResolvedValue({
    data: {
      session: {
        user: {
          ...account,
          user_metadata: { full_name: { invalid: true }, name: ' ', avatar_url: [] },
        },
      },
    },
  });
  render(<AuthMenu />);

  const trigger = await screen.findByRole('button', { name: 'Account' });
  expect(trigger).toHaveTextContent('J');
  fireEvent.click(trigger);

  expect(screen.getAllByText('john@doe.com')).toHaveLength(2);
});

test('pressing the backdrop dismisses the settings dialog', async () => {
  const dialog = await openSettings();

  fireEvent.click(dialog);

  expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
});

test('shows a sign-out error and keeps the account dialog open', async () => {
  authApi.signOut.mockResolvedValue({ error: new Error('Network error') });
  const dialog = await openSettings();

  fireEvent.click(within(dialog).getByRole('button', { name: /sign out/i }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Could not sign out.',
  );
});
