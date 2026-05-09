export function getOptionsApiBase() {
  return import.meta.env.VITE_OPTIONS_API_BASE || globalThis.__SELL_PUT_OPTIONS_API_BASE__ || '';
}

export function normalizePutForComparison(put, fallbackSupport) {
  return {
    id: `real-${put.symbol || `${put.strike}-${put.delta}`}`,
    strike: put.strike,
    premium: put.mid,
    delta: Math.abs(Number(put.delta)),
    dte: put.dte,
    support: fallbackSupport,
    contracts: 1,
    sourceSymbol: put.symbol,
  };
}

export function selectPutsForComparison(puts = [], fallbackSupport, maxRows = 5) {
  return puts
    .filter((put) => {
      const absDelta = Math.abs(Number(put.delta));
      const dte = Number(put.dte);
      const hasMarket = Number(put.bid) > 0 && Number(put.ask) > 0 && Number(put.mid) > 0;
      return absDelta >= 0.15 && absDelta <= 0.3 && dte >= 21 && dte <= 60 && hasMarket;
    })
    .sort((a, b) => Math.abs(Number(b.delta)) - Math.abs(Number(a.delta)) || Number(b.strike) - Number(a.strike))
    .slice(0, maxRows)
    .map((put) => normalizePutForComparison(put, fallbackSupport));
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
