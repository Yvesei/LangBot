import { SignInButton } from './header/SignInButton';

function getLimitMessage(limit: number) {
  const messageLabel = limit === 1 ? 'message' : 'messages';
  return `You've used your ${limit} free ${messageLabel}.`;
}

export function GuestMessageLimitPrompt({ limit }: { limit: number }) {
  return (
    <section
      className="guest-message-limit"
      role="dialog"
      aria-labelledby="guest-message-limit-title"
      aria-describedby="guest-message-limit-description"
    >
      <div className="guest-message-limit-copy">
        <h2
          id="guest-message-limit-title"
          className="guest-message-limit-title"
        >
          {getLimitMessage(limit)}
        </h2>
        <p
          id="guest-message-limit-description"
          className="guest-message-limit-description"
        >
          Sign in with Google to keep using Languify.
        </p>
      </div>
      <SignInButton variant="call-to-action" />
    </section>
  );
}
