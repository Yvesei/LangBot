import dotenv from 'dotenv';
import path from 'path';

// Resolve path to the parent folder’s .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });


const MIN_INTERVAL_MS = Number(process.env.TEST_MIN_INTERVAL_MS);
let lastCall = 0;

declare global {
  var rateCall: <T>(fn: () => Promise<T>) => Promise<T>;
}
global.rateCall = async function rateCall<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 2000
): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastCall));
  if (wait > 0) {
    console.log(`!! Waiting ${wait}ms before next API call`);
    await new Promise((r) => setTimeout(r, wait));
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();

      // If the API returns 429, throw to trigger retry
      if (result && typeof result === 'object' && 'status' in result && result.status === 429) {
        throw { code: 3505, message: 'Service tier capacity exceeded' };
      }


      lastCall = Date.now();
      return result;
    } catch (err: any) {
      if (err?.code === 3505 || err?.message?.includes('Service tier capacity exceeded')) {
        if (attempt < retries) {
          console.log(`⚠️ Capacity exceeded, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
      }
      throw err;
    }
  }

  throw new Error('Exceeded retries due to Mistral service capacity errors');
};
