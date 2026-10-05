import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, { TextDecoder, TextEncoder });
// next/jest can load .env.local while preparing its config. Strip credentials
// and deny network by default; individual tests must provide synthetic responses.
delete process.env.MISTRAL_API_KEY;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
globalThis.fetch = jest.fn(async () => {
  throw new Error('Live network calls are disabled in tests.');
});

// Temporary type bridge for legacy live suites, replaced with mocked tests in the text-chat PR.
declare global {
  var rateCall: <T>(fn: () => Promise<T>) => Promise<T>;
}
