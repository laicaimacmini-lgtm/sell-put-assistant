#!/usr/bin/env node
import dotenv from 'dotenv';
import { fetchOptionsChain } from '../server/optionsProvider.js';
import { validateOptionsChain } from './validateOptionsChain.js';

dotenv.config();

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : 'true';
    args[key] = value;
    if (value !== 'true') index += 1;
  }
  return args;
}

function printReport({ provider, ticker, expiration, response, errors }) {
  console.log('Options Provider Smoke Test');
  console.log(`Provider: ${provider}`);
  console.log(`Ticker: ${ticker}`);
  console.log(`Expiration: ${expiration}`);
  console.log(`Status: ${errors.length ? 'FAIL' : 'PASS'}`);

  if (errors.length) {
    for (const error of errors) console.error(`FAIL: ${error}`);
    return;
  }

  console.log(`Puts returned: ${response.puts.length}`);
  const sample = response.puts.find((put) => put.strike && put.mid) || response.puts[0];
  console.log('Sample:');
  console.log(`Strike: ${sample.strike}`);
  console.log(`Mid: ${sample.mid}`);
  console.log(`Delta: ${Math.abs(Number(sample.delta))}`);
  console.log(`DTE: ${sample.dte}`);
}

export async function runSmokeOptionsProvider(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const ticker = args.ticker || 'SMH';
  const expiration = args.expiration || '2026-06-19';
  const provider = args.provider || process.env.OPTIONS_DATA_PROVIDER || 'mock';

  try {
    const response = await fetchOptionsChain({ ticker, expiration, provider });
    const errors = validateOptionsChain(response);
    printReport({ provider, ticker, expiration, response, errors });
    return errors.length ? 1 : 0;
  } catch (error) {
    console.log('Options Provider Smoke Test');
    console.log(`Provider: ${provider}`);
    console.log(`Ticker: ${ticker}`);
    console.log(`Expiration: ${expiration}`);
    console.log('Status: FAIL');
    console.error(`FAIL: ${error.message}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await runSmokeOptionsProvider();
  process.exit(exitCode);
}
