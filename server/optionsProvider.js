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
  if (value) return value;

  const messages = {
    tradier: 'Missing TRADIER_TOKEN for Tradier provider',
    alphavantage: 'Missing ALPHAVANTAGE_API_KEY for Alpha Vantage provider',
    marketdata: 'Missing MARKETDATA_TOKEN for MarketData.app provider',
  };
  throw new OptionsProviderError(messages[provider] || `${provider} provider requires ${name}. Add it to local .env; never expose it in frontend code.`, 400);
}

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOptionArray(rawOptions) {
  if (!rawOptions) return [];
  return Array.isArray(rawOptions) ? rawOptions : [rawOptions];
}

function calculateDte(expiration, today = new Date()) {
  if (!expiration) return null;
  const expiryDate = new Date(`${expiration}T00:00:00Z`);
  if (Number.isNaN(expiryDate.getTime())) return null;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiryUtc = Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate());
  return Math.max(0, Math.ceil((expiryUtc - todayUtc) / 86400000));
}

function unixTimestampToDateString(timestamp) {
  const parsed = normalizeNumber(timestamp, null);
  if (parsed === null) return null;
  return new Date(parsed * 1000).toISOString().slice(0, 10);
}

function expirationToUnixTimestamp(expiration) {
  const parsed = Date.parse(`${expiration}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

async function parseJsonResponse(response, providerLabel) {
  try {
    return await response.json();
  } catch (_error) {
    throw new OptionsProviderError(`${providerLabel} returned a non-JSON response`, 502);
  }
}

function isPutOption(option) {
  const type = String(option?.option_type ?? option?.type ?? option?.put_call ?? option?.side ?? '').toLowerCase();
  if (type === 'put' || type === 'p') return true;
  return String(option?.symbol ?? option?.optionSymbol ?? '').toUpperCase().includes('P00');
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function midpointFrom({ bid, ask, last, mark }) {
  if (bid > 0 && ask > 0) return Number(((bid + ask) / 2).toFixed(2));
  return last ?? mark ?? 0;
}

function alphaVantageErrorMessage(data) {
  const message = data?.['Error Message'] || data?.Information || data?.Note || 'unknown error';
  if (/premium|endpoint|subscription|entitlement/i.test(message)) {
    return `Alpha Vantage options endpoint is premium-required: ${message}`;
  }
  return `Alpha Vantage rejected the request: ${message}`;
}

function ensurePuts(puts, providerLabel) {
  if (puts.length === 0) {
    throw new OptionsProviderError(`No puts returned. Check whether expiration is valid for this ticker. Provider: ${providerLabel}.`, 404);
  }
  return puts;
}

export function mapTradierPut(option, { expiration } = {}) {
  const bid = normalizeNumber(option.bid, 0);
  const ask = normalizeNumber(option.ask, 0);
  const last = normalizeNumber(option.last, null);
  const mark = normalizeNumber(option.mark, null);
  const dte = normalizeNumber(option.days_to_expiration ?? option.daysToExpiration ?? option.dte, calculateDte(expiration));

  return {
    symbol: option.symbol,
    strike: normalizeNumber(option.strike, 0),
    bid,
    ask,
    mid: midpointFrom({ bid, ask, last, mark }),
    last: last ?? 0,
    delta: normalizeNumber(option?.greeks?.delta ?? option?.delta, null),
    iv: normalizeNumber(option?.greeks?.mid_iv ?? option?.greeks?.smv_vol ?? option?.greeks?.iv ?? option.smv_vol ?? option.iv, null),
    openInterest: normalizeNumber(option.open_interest ?? option.openInterest, 0),
    volume: normalizeNumber(option.volume, 0),
    dte: dte ?? 0,
  };
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

  if (!response.ok) throw new OptionsProviderError(tradierErrorForStatus(response.status), response.status);

  const data = await parseJsonResponse(response, 'Tradier');
  if (!data || typeof data !== 'object' || !('options' in data)) {
    throw new OptionsProviderError('Tradier returned an unexpected response format', 502);
  }

  const options = normalizeOptionArray(data?.options?.option);
  const puts = ensurePuts(options.filter(isPutOption).map((option) => mapTradierPut(option, { expiration })), 'Tradier');

  return { ticker, expiration, source: 'tradier', lastUpdated: new Date().toISOString(), puts };
}

export function mapAlphaVantagePut(option, { expiration } = {}) {
  const bid = normalizeNumber(firstValue(option.bid, option.bid_price), 0);
  const ask = normalizeNumber(firstValue(option.ask, option.ask_price), 0);
  const last = normalizeNumber(firstValue(option.last, option.last_price, option.lastPrice), null);
  const mark = normalizeNumber(firstValue(option.mark, option.mid, option.midpoint), null);
  const optionExpiration = firstValue(option.expiration, option.expirationDate, option.expiration_date, expiration);
  const dte = normalizeNumber(firstValue(option.dte, option.days_to_expiration, option.daysToExpiration), calculateDte(optionExpiration));

  return {
    symbol: firstValue(option.symbol, option.contractID, option.contractId, option.option_symbol, option.optionSymbol),
    strike: normalizeNumber(option.strike, 0),
    bid,
    ask,
    mid: midpointFrom({ bid, ask, last, mark }),
    last: last ?? 0,
    delta: normalizeNumber(firstValue(option.delta, option.greeks?.delta), null),
    iv: normalizeNumber(firstValue(option.implied_volatility, option.impliedVolatility, option.iv, option.greeks?.iv), null),
    openInterest: normalizeNumber(firstValue(option.open_interest, option.openInterest), 0),
    volume: normalizeNumber(option.volume, 0),
    dte: dte ?? 0,
  };
}

function extractAlphaVantageOptions(data) {
  return normalizeOptionArray(data?.data ?? data?.options ?? data?.option_chain ?? data?.optionChain ?? data?.contracts ?? data?.option);
}

async function fetchAlphaVantageOptionsChain({ ticker, expiration }) {
  const apiKey = requireEnv('ALPHAVANTAGE_API_KEY', 'alphavantage');
  const baseUrl = process.env.ALPHAVANTAGE_BASE_URL || 'https://www.alphavantage.co/query';
  const url = new URL(baseUrl);
  url.searchParams.set('function', 'HISTORICAL_OPTIONS');
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('date', expiration);
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new OptionsProviderError(`Alpha Vantage request failed with HTTP ${response.status}`, response.status);
  const data = await parseJsonResponse(response, 'Alpha Vantage');
  if (data?.['Error Message'] || data?.Information || data?.Note) {
    throw new OptionsProviderError(alphaVantageErrorMessage(data), 400);
  }

  const puts = ensurePuts(
    extractAlphaVantageOptions(data)
      .filter((option) => isPutOption(option) || String(firstValue(option.type, option.option_type, option.contract_type, '')).toLowerCase().includes('put'))
      .map((option) => mapAlphaVantagePut(option, { expiration })),
    'Alpha Vantage',
  );

  return { ticker, expiration, source: 'alphavantage', lastUpdated: new Date().toISOString(), puts };
}

export function mapMarketDataPut(option, { expiration } = {}) {
  const bid = normalizeNumber(firstValue(option.bid, option.bidPrice, option.bid_price), 0);
  const ask = normalizeNumber(firstValue(option.ask, option.askPrice, option.ask_price), 0);
  const last = normalizeNumber(firstValue(option.last, option.lastPrice, option.last_price), null);
  const mark = normalizeNumber(firstValue(option.mid, option.mark, option.midpoint), null);
  const optionExpiration = firstValue(option.expiration, option.expirationDate, option.expiration_date, expiration);
  const dte = normalizeNumber(firstValue(option.dte, option.daysToExpiration, option.days_to_expiration), calculateDte(optionExpiration));

  return {
    symbol: firstValue(option.symbol, option.optionSymbol, option.option_symbol),
    strike: normalizeNumber(option.strike, 0),
    bid,
    ask,
    mid: midpointFrom({ bid, ask, last, mark }),
    last: last ?? 0,
    delta: normalizeNumber(firstValue(option.delta, option.greeks?.delta), null),
    iv: normalizeNumber(firstValue(option.iv, option.impliedVolatility, option.implied_volatility, option.greeks?.iv), null),
    openInterest: normalizeNumber(firstValue(option.openInterest, option.open_interest, option.oi), 0),
    volume: normalizeNumber(option.volume, 0),
    dte: dte ?? 0,
  };
}

function extractMarketDataOptions(data) {
  if (Array.isArray(data?.optionSymbol)) {
    return data.optionSymbol.map((symbol, index) => ({
      symbol,
      strike: data.strike?.[index],
      bid: data.bid?.[index],
      ask: data.ask?.[index],
      mid: data.mid?.[index],
      last: data.last?.[index],
      delta: data.delta?.[index],
      iv: data.iv?.[index],
      openInterest: data.openInterest?.[index],
      volume: data.volume?.[index],
      dte: data.dte?.[index],
      expiration: data.expiration?.[index],
      side: data.side?.[index] ?? data.type?.[index],
    }));
  }
  return normalizeOptionArray(data?.options ?? data?.data ?? data?.chain ?? data?.option);
}

async function fetchMarketDataOptionsChain({ ticker, expiration }) {
  const token = requireEnv('MARKETDATA_TOKEN', 'marketdata');
  const baseUrl = process.env.MARKETDATA_BASE_URL || 'https://api.marketdata.app/v1';
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/options/chain/${ticker}/`);
  url.searchParams.set('expiration', expiration);
  url.searchParams.set('side', 'put');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new OptionsProviderError('MarketData.app authentication failed or plan does not allow this endpoint', response.status);
  }

  if (response.status === 400) {
    const errData = await parseJsonResponse(response, 'MarketData.app').catch(() => ({}));
    throw new OptionsProviderError(`MarketData.app request rejected. Check ticker and expiration. ${errData?.errmsg || ''}`.trim(), 400);
  }

  if (response.status === 404) {
    const errData = await parseJsonResponse(response, 'MarketData.app').catch(() => ({}));
    if (errData?.s === 'no_data') {
      throw new OptionsProviderError(
        `No options data for expiration ${expiration} on MarketData.app. The date may not be a valid expiration for ${ticker}. Try a Friday or monthly expiry date.`,
        404,
      );
    }
    throw new OptionsProviderError(`MarketData.app returned 404 for ${ticker} ${expiration}`, 404);
  }

  if (!response.ok) {
    throw new OptionsProviderError(`MarketData.app request failed with HTTP ${response.status}`, response.status);
  }

  const data = await parseJsonResponse(response, 'MarketData.app');
  if (data?.s === 'error') {
    throw new OptionsProviderError(`MarketData.app rejected the request: ${data.errmsg || 'unknown error'}`, 400);
  }
  if (data?.s === 'no_data') {
    throw new OptionsProviderError(
      `No puts returned for ${ticker} ${expiration} on MarketData.app. Check whether expiration is valid for this ticker.`,
      404,
    );
  }

  const puts = ensurePuts(
    extractMarketDataOptions(data).filter(isPutOption).map((option) => mapMarketDataPut(option, { expiration })),
    'MarketData.app',
  );
  return { ticker, expiration, source: 'marketdata', lastUpdated: new Date().toISOString(), puts };
}


function yahooErrorForStatus(status) {
  if (status === 401 || status === 403) return 'Yahoo Finance rejected the request. This unofficial local-only endpoint may be unavailable.';
  if (status === 404) return 'Yahoo Finance returned no options data for this ticker.';
  return `Yahoo Finance request failed with HTTP ${status}`;
}

function extractYahooResult(data) {
  const error = data?.optionChain?.error;
  if (error) throw new OptionsProviderError(`Yahoo Finance rejected the request: ${error.description || error.message || 'unknown error'}`, 400);
  const result = data?.optionChain?.result?.[0];
  if (!result) throw new OptionsProviderError('Yahoo Finance returned an unexpected response format', 502);
  return result;
}

async function fetchYahooJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new OptionsProviderError(yahooErrorForStatus(response.status), response.status);
  return parseJsonResponse(response, 'Yahoo Finance');
}

export function mapYahooPut(option, { expiration } = {}) {
  const bid = normalizeNumber(option.bid, 0);
  const ask = normalizeNumber(option.ask, 0);
  const last = normalizeNumber(firstValue(option.lastPrice, option.last, option.regularMarketPrice), null);
  const mark = normalizeNumber(firstValue(option.mid, option.mark), null);
  const optionExpiration = firstValue(option.expirationDate, option.expiration_date, expiration);
  const mappedExpiration = typeof optionExpiration === 'number' ? unixTimestampToDateString(optionExpiration) : optionExpiration;
  const dte = normalizeNumber(firstValue(option.dte, option.daysToExpiration, option.days_to_expiration), calculateDte(mappedExpiration || expiration));

  return {
    symbol: firstValue(option.contractSymbol, option.symbol, option.optionSymbol),
    strike: normalizeNumber(option.strike, 0),
    bid,
    ask,
    mid: midpointFrom({ bid, ask, last, mark }),
    last: last ?? 0,
    delta: null,
    iv: normalizeNumber(firstValue(option.impliedVolatility, option.iv), null),
    openInterest: normalizeNumber(firstValue(option.openInterest, option.open_interest), 0),
    volume: normalizeNumber(option.volume, 0),
    dte: dte ?? 0,
  };
}

async function fetchYahooExpirations({ ticker }) {
  const baseUrl = process.env.YAHOO_BASE_URL || 'https://query2.finance.yahoo.com/v7/finance/options';
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${ticker}`);
  const data = await fetchYahooJson(url);
  const result = extractYahooResult(data);
  const expirations = normalizeOptionArray(result.expirationDates)
    .map(unixTimestampToDateString)
    .filter(Boolean);

  if (expirations.length === 0) {
    throw new OptionsProviderError('No Yahoo Finance expirations returned for this ticker.', 404);
  }

  return { ticker, source: 'yahoo', expirations };
}

async function fetchYahooOptionsChain({ ticker, expiration }) {
  const baseUrl = process.env.YAHOO_BASE_URL || 'https://query2.finance.yahoo.com/v7/finance/options';
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${ticker}`);
  const timestamp = expirationToUnixTimestamp(expiration);
  if (timestamp === null) throw new OptionsProviderError('expiration must be YYYY-MM-DD for Yahoo provider', 400);
  url.searchParams.set('date', String(timestamp));

  const data = await fetchYahooJson(url);
  const result = extractYahooResult(data);
  const puts = ensurePuts(normalizeOptionArray(result.options?.[0]?.puts).map((option) => mapYahooPut(option, { expiration })), 'Yahoo Finance');

  return { ticker, expiration, source: 'yahoo', lastUpdated: new Date().toISOString(), puts };
}

async function fetchMarketDataExpirations({ ticker }) {
  const token = requireEnv('MARKETDATA_TOKEN', 'marketdata');
  const baseUrl = process.env.MARKETDATA_BASE_URL || 'https://api.marketdata.app/v1';
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/options/expirations/${ticker}/`);
  url.searchParams.set('side', 'put');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (response.status === 401 || response.status === 403) {
    throw new OptionsProviderError(
      'MarketData.app authentication failed or plan does not allow this endpoint',
      response.status,
    );
  }
  if (!response.ok) {
    throw new OptionsProviderError(
      `MarketData.app expirations request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  const data = await parseJsonResponse(response, 'MarketData.app');
  if (data?.s === 'error') {
    throw new OptionsProviderError(`MarketData.app rejected the request: ${data.errmsg || 'unknown error'}`, 400);
  }
  if (data?.s === 'no_data' || !Array.isArray(data?.expirations) || data.expirations.length === 0) {
    throw new OptionsProviderError('No expirations returned for this ticker', 404);
  }

  return { ticker, source: 'marketdata', lastUpdated: new Date().toISOString(), expirations: data.expirations };
}

export async function fetchOptionsExpirations({ ticker, provider = process.env.OPTIONS_DATA_PROVIDER } = {}) {
  const normalizedTicker = String(ticker || '').trim().toUpperCase();
  if (!normalizedTicker) throw new OptionsProviderError('ticker is required', 400);

  const selectedProvider = normalizeProvider(provider);
  if (selectedProvider === 'yahoo') return fetchYahooExpirations({ ticker: normalizedTicker });
  if (selectedProvider === 'marketdata') return fetchMarketDataExpirations({ ticker: normalizedTicker });

  throw new OptionsProviderError(`${selectedProvider} provider does not support expiration discovery yet. Enter an expiration manually.`, 501);
}

async function fetchUnsupportedProvider(provider) {
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
  if (selectedProvider === 'alphavantage') return fetchAlphaVantageOptionsChain({ ticker: normalizedTicker, expiration: normalizedExpiration });
  if (selectedProvider === 'marketdata') return fetchMarketDataOptionsChain({ ticker: normalizedTicker, expiration: normalizedExpiration });
  if (selectedProvider === 'tradier') return fetchTradierOptionsChain({ ticker: normalizedTicker, expiration: normalizedExpiration });
  if (selectedProvider === 'yahoo') return fetchYahooOptionsChain({ ticker: normalizedTicker, expiration: normalizedExpiration });
  if (selectedProvider === 'alpaca') return fetchUnsupportedProvider(selectedProvider);

  throw new OptionsProviderError(`Unknown OPTIONS_DATA_PROVIDER: ${selectedProvider}`, 400);
}
