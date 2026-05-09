const chains = {
  SMH: [
    { strike: 245, bid: 6.1, ask: 6.3, last: 6.15, delta: -0.3, iv: 0.36, openInterest: 980, volume: 260, dte: 45 },
    { strike: 240, bid: 4.1, ask: 4.3, last: 4.15, delta: -0.22, iv: 0.34, openInterest: 1200, volume: 300, dte: 45 },
    { strike: 235, bid: 2.6, ask: 2.8, last: 2.7, delta: -0.16, iv: 0.33, openInterest: 1440, volume: 410, dte: 45 },
    { strike: 230, bid: 1.8, ask: 2.0, last: 1.9, delta: -0.12, iv: 0.32, openInterest: 860, volume: 180, dte: 45 },
    { strike: 250, bid: 8.2, ask: 8.7, last: 8.4, delta: -0.42, iv: 0.38, openInterest: 640, volume: 160, dte: 45 },
  ],
  NVDA: [
    { strike: 900, bid: 24.5, ask: 25.4, last: 24.9, delta: -0.29, iv: 0.52, openInterest: 2100, volume: 820, dte: 42 },
    { strike: 880, bid: 18.1, ask: 18.8, last: 18.4, delta: -0.23, iv: 0.5, openInterest: 1800, volume: 660, dte: 42 },
    { strike: 850, bid: 11.4, ask: 12.0, last: 11.7, delta: -0.17, iv: 0.48, openInterest: 2500, volume: 710, dte: 42 },
    { strike: 820, bid: 7.0, ask: 7.4, last: 7.2, delta: -0.12, iv: 0.47, openInterest: 1300, volume: 390, dte: 42 },
  ],
  MU: [
    { strike: 118, bid: 3.2, ask: 3.5, last: 3.35, delta: -0.28, iv: 0.45, openInterest: 900, volume: 300, dte: 38 },
    { strike: 115, bid: 2.35, ask: 2.55, last: 2.45, delta: -0.22, iv: 0.43, openInterest: 1120, volume: 420, dte: 38 },
    { strike: 110, bid: 1.35, ask: 1.55, last: 1.45, delta: -0.16, iv: 0.41, openInterest: 1600, volume: 510, dte: 38 },
    { strike: 105, bid: 0.85, ask: 1.0, last: 0.92, delta: -0.11, iv: 0.4, openInterest: 720, volume: 190, dte: 38 },
  ],
};

function optionSymbol(ticker, expiration, strike) {
  const compactDate = expiration.replaceAll('-', '').slice(2);
  const strikePart = String(Math.round(strike * 1000)).padStart(8, '0');
  return `${ticker}${compactDate}P${strikePart}`;
}

export function getMockOptionsChain({ ticker = 'SMH', expiration = '2026-06-19' } = {}) {
  const normalizedTicker = ticker.toUpperCase();
  const puts = (chains[normalizedTicker] || chains.SMH).map((put) => ({
    symbol: optionSymbol(normalizedTicker, expiration, put.strike),
    strike: put.strike,
    bid: put.bid,
    ask: put.ask,
    mid: Number(((put.bid + put.ask) / 2).toFixed(2)),
    last: put.last,
    delta: put.delta,
    iv: put.iv,
    openInterest: put.openInterest,
    volume: put.volume,
    dte: put.dte,
  }));

  return {
    ticker: normalizedTicker,
    expiration,
    source: 'mock',
    lastUpdated: new Date().toISOString(),
    puts,
  };
}
