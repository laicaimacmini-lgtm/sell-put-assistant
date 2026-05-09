import { getMockOptionsChain } from './mockOptionsData.js';

export class OptionsProviderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'OptionsProviderError';
    this.status = status;
  }
}

function normalizeProvider(provider = process.env.OPTIONS_DATA_PROVIDER || 'mock') {
  return provider.toLowerCase();
}

function requireEnv(name, provider) {
  const value = process.env[name];
  if (!value) {
    throw new OptionsProviderError(`${provider} provider requires ${name}. Add it to local .env; never expose it in frontend code.`, 400);
  }
  return value;
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDelta(option) {
  const greeksDelta = option?.greeks?.delta ?? option?.delta;
  return normalizeNumber(greeksDelta, null);
}

export function mapTradierPut(option) {
  const bid = normalizeNumber(option.bid, 0);
  const ask = normalizeNumber(option.ask, 0);
  const mid = bid && ask ? Number(((bid + ask) / 2).toFixed(2)) : normalizeNumber(option.last, 0);
  return {
    symbol: option.symbol,
    strike: normalizeNumber(option.strike, 0),
    bid,
    ask,
    mid,
    last: normalizeNumber(option.last, 0),
    delta: normalizeDelta(option),
    iv: normalizeNumber(option?.greeks?.mid_iv ?? option?.greeks?.iv ?? option.iv, null),
    openInterest: normalizeNumber(option.open_interest ?? option.openInterest, 0),
    volume: normalizeNumber(option.volume, 0),
    dte: normalizeNumber(option.dte, 0),
  };
}

async function fetchTradierOptionsChain({ ticker, expiration }) {
  const token = requireEnv('TRADIER_TOKEN', 'tradier');
  const url = new URL('https://api.tradier.com/v1/markets/options/chains');
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('expiration', expiration);
  url.searchParams.set('greeks', 'true');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new OptionsProviderError(`tradier request failed with HTTP ${response.status}`, response.status);
  }

  const data = await response.json();
  const rawOptions = data?.options?.option ?? [];
  const options = Array.isArray(rawOptions) ? rawOptions : [rawOptions];
  const puts = options.filter((option) => option.option_type === 'put' || option.type === 'put').map(mapTradierPut);

  return {
    ticker,
    expiration,
    source: 'tradier',
    lastUpdated: new Date().toISOString(),
    puts,
  };
}

async function fetchUnsupportedProvider(provider) {
  if (provider === 'marketdata') requireEnv('MARKETDATA_TOKEN', 'marketdata');
  if (provider === 'alpaca') {
    requireEnv('ALPACA_KEY', 'alpaca');
    requireEnv('ALPACA_SECRET', 'alpaca');
  }
  throw new OptionsProviderError(`${provider} provider is configured but not implemented yet. Use OPTIONS_DATA_PROVIDER=mock for now.`, 501);
}

export async function fetchOptionsChain({ ticker, expiration, provider = process.env.OPTIONS_DATA_PROVIDER } = {}) {
  const normalizedTicker = String(ticker || '').trim().toUpperCase();
  const normalizedExpiration = String(expiration || '').trim();
  if (!normalizedTicker) throw new OptionsProviderError('ticker is required', 400);
  if (!normalizedExpiration) throw new OptionsProviderError('expiration is required', 400);

  const selectedProvider = normalizeProvider(provider);
  if (selectedProvider === 'mock') return getMockOptionsChain({ ticker: normalizedTicker, expiration: normalizedExpiration });
  if (selectedProvider === 'tradier') return fetchTradierOptionsChain({ ticker: normalizedTicker, expiration: normalizedExpiration });
  if (selectedProvider === 'marketdata' || selectedProvider === 'alpaca') return fetchUnsupportedProvider(selectedProvider);

  throw new OptionsProviderError(`Unknown OPTIONS_DATA_PROVIDER: ${selectedProvider}`, 400);
}
