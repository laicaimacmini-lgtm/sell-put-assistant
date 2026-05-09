#!/usr/bin/env node
import dotenv from 'dotenv';
import { fetchOptionsChain } from '../server/optionsProvider.js';
import { validateOptionsChain } from './validateOptionsChain.js';

dotenv.config({ quiet: true });

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

function countValidMid(puts) {
  return puts.filter((put) => typeof put.mid === 'number' && Number.isFinite(put.mid) && put.mid > 0).length;
}

function countValidDelta(puts) {
  return puts.filter((put) => Number.isFinite(Math.abs(Number(put.delta)))).length;
}

function printSampleRows(puts) {
  console.log('Sample rows:');
  for (const put of puts.slice(0, 3)) {
    console.log(`- Strike: ${put.strike} | Bid: ${put.bid} | Ask: ${put.ask} | Mid: ${put.mid} | Delta: ${Math.abs(Number(put.delta))} | IV: ${put.iv ?? 'n/a'} | OI: ${put.openInterest} | Volume: ${put.volume} | DTE: ${put.dte}`);
  }
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
  console.log(`Count with valid mid: ${countValidMid(response.puts)}`);
  console.log(`Count with delta: ${countValidDelta(response.puts)}`);
  printSampleRows(response.puts);
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
