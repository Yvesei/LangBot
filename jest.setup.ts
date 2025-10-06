import dotenv from 'dotenv';
import path from 'path';

// Resolve path to the parent folder’s .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });


const MIN_INTERVAL_MS = Number(process.env.TEST_MIN_INTERVAL_MS || 1500);
let lastCall = 0;

// helper that enforces a delay between API calls
global.rateCall = async function rateCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastCall));
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  const result = await fn();
  lastCall = Date.now();
  return result;
};