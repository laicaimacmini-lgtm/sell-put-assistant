#!/usr/bin/env node
import dotenv from 'dotenv';
import { fetchOptionsChain, fetchOptionsExpirations } from '../server/optionsProvider.js';
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

function dteFor(dateString, today = new Date()) {
  const expiryDate = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(expiryDate.getTime())) return null;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiryUtc = Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate());
  return Math.ceil((expiryUtc - todayUtc) / 86400000);
}

export function pickSmokeExpiration(expirations = [], today = new Date()) {
  const future = expirations
    .map((expiration) => ({ expiration, dte: dteFor(expiration, today) }))
    .filter((item) => Number.isFinite(item.dte) && item.dte >= 0)
    .sort((a, b) => a.dte - b.dte);
  return future.find((item) => item.dte >= 30 && item.dte <= 60)?.expiration || future[0]?.expiration || '';
}

function countValidMid(puts) {
  return puts.filter((put) => typeof put.mid === 'number' && Number.isFinite(put.mid) && put.mid > 0).length;
}

function countValidDelta(puts) {
  return puts.filter((put) => put.delta !== null && Number.isFinite(Math.abs(Number(put.delta)))).length;
}

function formatDelta(delta) {
  if (delta === null || delta === undefined || delta === '') return 'n/a';
  const parsed = Math.abs(Number(delta));
  return Number.isFinite(parsed) ? String(parsed) : 'n/a';
}

function printSampleRows(puts) {
  console.log('Sample rows:');
  for (const put of puts.slice(0, 3)) {
    console.log(`- Strike: ${put.strike} | Bid: ${put.bid} | Ask: ${put.ask} | Mid: ${put.mid} | Delta: ${formatDelta(put.delta)} | IV: ${put.iv ?? 'n/a'} | OI: ${put.openInterest} | Volume: ${put.volume} | DTE: ${put.dte}`);
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

async function resolveExpiration({ ticker, provider, expiration }) {
  if (expiration) return expiration;
  if (provider !== 'yahoo') return '2026-06-19';

  const response = await fetchOptionsExpirations({ ticker, provider });
  const selectedExpiration = pickSmokeExpiration(response.expirations);
  if (!selectedExpiration) throw new Error('No Yahoo Finance expirations returned for smoke test.');
  console.log(`Selected expiration: ${selectedExpiration}`);
  return selectedExpiration;
}

export async function runSmokeOptionsProvider(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const ticker = args.ticker || 'SMH';
  const provider = args.provider || process.env.OPTIONS_DATA_PROVIDER || 'mock';
  let expiration = args.expiration || '';

  try {
    expiration = await resolveExpiration({ ticker, provider, expiration });
    const response = await fetchOptionsChain({ ticker, expiration, provider });
    const errors = validateOptionsChain(response);
    printReport({ provider, ticker, expiration, response, errors });
    return errors.length ? 1 : 0;
  } catch (error) {
    console.log('Options Provider Smoke Test');
    console.log(`Provider: ${provider}`);
    console.log(`Ticker: ${ticker}`);
    console.log(`Expiration: ${expiration || '(auto)'}`);
    console.log('Status: FAIL');
    console.error(`FAIL: ${error.message}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await runSmokeOptionsProvider();
  process.exit(exitCode);
}
