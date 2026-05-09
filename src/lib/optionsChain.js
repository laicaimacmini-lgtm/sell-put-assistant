export function getOptionsApiBase() {
  return import.meta.env.VITE_OPTIONS_API_BASE || globalThis.__SELL_PUT_OPTIONS_API_BASE__ || '';
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasMarketQuote(put) {
  return Number(put.bid) > 0 && Number(put.ask) > 0 && Number(put.mid) > 0;
}

function hasDelta(put) {
  return put.delta !== null && put.delta !== undefined && put.delta !== '' && finiteNumber(put.delta) !== null;
}

export function normalizePutForComparison(put, fallbackSupport) {
  const absDelta = hasDelta(put) ? Math.abs(Number(put.delta)) : '';
  return {
    id: `real-${put.symbol || `${put.strike}-${absDelta || 'no-delta'}`}`,
    strike: put.strike,
    premium: put.mid,
    delta: absDelta,
    dte: put.dte,
    support: fallbackSupport,
    contracts: 1,
    sourceSymbol: put.symbol,
  };
}

export function hasUnavailableDelta(puts = []) {
  return puts.some((put) => !hasDelta(put));
}

function scoreFallbackPut(put, fallbackSupport, currentPrice) {
  const strike = Number(put.strike);
  const support = Number(fallbackSupport);
  const price = Number(currentPrice);
  const supportScore = Number.isFinite(support) ? Math.abs(strike - support) : 0;
  const otmScore = Number.isFinite(price) && strike < price ? 0 : 1000;
  return otmScore + supportScore;
}

export function selectPutsForComparison(puts = [], fallbackSupport, maxRows = 5, currentPrice) {
  const candidates = puts.filter((put) => {
    const dte = Number(put.dte);
    return dte >= 21 && dte <= 60 && hasMarketQuote(put);
  });

  const deltaQualified = candidates.filter((put) => {
    const absDelta = Math.abs(Number(put.delta));
    return Number.isFinite(absDelta) && absDelta >= 0.15 && absDelta <= 0.3;
  });

  const selected = (deltaQualified.length > 0 ? deltaQualified : candidates)
    .sort((a, b) => {
      if (deltaQualified.length > 0) {
        return Math.abs(Number(b.delta)) - Math.abs(Number(a.delta)) || Number(b.strike) - Number(a.strike);
      }
      return scoreFallbackPut(a, fallbackSupport, currentPrice) - scoreFallbackPut(b, fallbackSupport, currentPrice);
    })
    .slice(0, maxRows);

  return selected.map((put) => normalizePutForComparison(put, fallbackSupport));
}

export async function fetchOptionsChain({ ticker, expiration, provider, apiBase = getOptionsApiBase() }) {
  if (!apiBase) {
    throw new Error('Real options data requires the local API proxy. Run npm run server locally.');
  }
  const url = new URL('/api/options-chain', apiBase);
  url.searchParams.set('ticker', ticker);
  url.searchParams.set('expiration', expiration);
  if (provider) url.searchParams.set('provider', provider);
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Options proxy request failed with HTTP ${response.status}`);
  }
  return payload;
}

export async function fetchOptionsExpirations({ ticker, provider, apiBase = getOptionsApiBase() }) {
  if (!apiBase) {
    throw new Error('Expiration discovery requires the local API proxy. Run npm run server locally.');
  }
  const url = new URL('/api/options-expirations', apiBase);
  url.searchParams.set('ticker', ticker);
  if (provider) url.searchParams.set('provider', provider);
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Options expirations request failed with HTTP ${response.status}`);
  }
  return payload;
}
