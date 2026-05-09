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
    const message = provider === 'tradier'
      ? 'Missing TRADIER_TOKEN for Tradier provider'
      : `${provider} provider requires ${name}. Add it to local .env; never expose it in frontend code.`;
    throw new OptionsProviderError(message, 400);
  }
  return value;
}

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDelta(option) {
  const greeksDelta = option?.greeks?.delta ?? option?.delta;
  return normalizeNumber(greeksDelta, null);
}

function normalizeOptionArray(rawOptions) {
  if (!rawOptions) return [];
  return Array.isArray(rawOptions) ? rawOptions : [rawOptions];
}

function isPutOption(option) {
  const type = String(option?.option_type ?? option?.type ?? option?.put_call ?? '').toLowerCase();
  if (type === 'put' || type === 'p') return true;
  return String(option?.symbol ?? '').toUpperCase().includes('P00');
}

function calculateDte(expiration, today = new Date()) {
  if (!expiration) return null;
  const expiryDate = new Date(`${expiration}T00:00:00Z`);
  if (Number.isNaN(expiryDate.getTime())) return null;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiryUtc = Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate());
  return Math.max(0, Math.ceil((expiryUtc - todayUtc) / 86400000));
}

export function mapTradierPut(option, { expiration } = {}) {
  const bid = normalizeNumber(option.bid, 0);
  const ask = normalizeNumber(option.ask, 0);
  const last = normalizeNumber(option.last, null);
  const mark = normalizeNumber(option.mark, null);
  const mid = bid > 0 && ask > 0 ? Number(((bid + ask) / 2).toFixed(2)) : (last ?? mark ?? 0);
  const dte = normalizeNumber(
    option.days_to_expiration ?? option.daysToExpiration ?? option.dte,
    calculateDte(expiration),
  );

  return {
    symbol: option.symbol,
    strike: normalizeNumber(option.strike, 0),
    bid,
    ask,
    mid,
    last: last ?? 0,
    delta: normalizeDelta(option),
    iv: normalizeNumber(
      option?.greeks?.mid_iv
        ?? option?.greeks?.smv_vol
        ?? option?.greeks?.iv
        ?? option.smv_vol
        ?? option.iv,
      null,
    ),
    openInterest: normalizeNumber(option.open_interest ?? option.openInterest, 0),
    volume: normalizeNumber(option.volume, 0),
    dte: dte ?? 0,
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (_error) {
    throw new OptionsProviderError('Tradier returned a non-JSON response', 502);
  }
}

function tradierErrorForStatus(status) {
  if (status === 401 || status === 403) return 'Tradier authentication failed';
  if (status === 400) return 'Tradier request rejected. Check ticker and expiration.';
  return `Tradier request failed with HTTP ${status}`;
}

async function fetchTradierOptionsChain({ ticker, expiration }) {
  const token = requireEnv('TRADIER_TOKEN', 'tradier');
  const baseUrl = process.env.TRADIER_BASE_URL || 'https://api.tradier.com/v1';
  const url = new URL('/markets/options/chains', baseUrl);
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
    throw new OptionsProviderError(tradierErrorForStatus(response.status), response.status);
  }

  const data = await parseJsonResponse(response);
  if (!data || typeof data !== 'object' || !('options' in data)) {
    throw new OptionsProviderError('Tradier returned an unexpected response format', 502);
  }

  const options = normalizeOptionArray(data?.options?.option);
  const puts = options.filter(isPutOption).map((option) => mapTradierPut(option, { expiration }));

  if (puts.length === 0) {
    throw new OptionsProviderError('No puts returned. Check whether expiration is valid for this ticker.', 404);
  }

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
