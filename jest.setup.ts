import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, { TextDecoder, TextEncoder });
// next/jest can load .env.local while preparing its config. Strip credentials
// and deny network by default; individual tests must provide synthetic responses.
delete process.env.MISTRAL_API_KEY;
// Supabase auth must stay off in tests: no network, no cookie writes.
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

// Minimal <dialog> shim for jsdom builds without showModal support: the review
// and settings dialogs mount through the native element in component tests.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute('open', '');
  };

  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };

  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
}
globalThis.fetch = jest.fn(async () => {
  throw new Error('Live network calls are disabled in tests.');
});
