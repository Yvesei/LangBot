import dotenv from 'dotenv';
import { evaluate } from './evaluate';
import { getPrice, getRepeatCount, loadCases, VARIANTS } from './config';
import { writeReport } from './report';

async function main() {
  dotenv.config({ path: '.env.local', quiet: true });
  const cases = await loadCases();
  const repeat = getRepeatCount();
  if (!process.argv.includes('--live')) {
    console.log(
      `Validated ${cases.length} fixtures. No API calls made. --live runs ${cases.length * VARIANTS.length * repeat} logical requests (each can retry once).`,
    );
    return;
  }
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY is required for --live.');
  }
  const prices = {
    input: getPrice('EVAL_INPUT_USD_PER_MILLION'),
    output: getPrice('EVAL_OUTPUT_USD_PER_MILLION'),
  };
  const startedAt = new Date().toISOString();
  const rows = await evaluate(cases, repeat, prices);
  await writeReport(rows, prices, startedAt);
  if (rows.some((row) => !row.completed)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed');
  process.exitCode = 1;
});
