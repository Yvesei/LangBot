import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, { TextDecoder, TextEncoder });
// next/jest can load .env.local while preparing its config. Strip credentials
// and deny network by default; individual tests must provide synthetic responses.
delete process.env.MISTRAL_API_KEY;
globalThis.fetch = jest.fn(async () => {
  throw new Error('Live network calls are disabled in tests.');
});
