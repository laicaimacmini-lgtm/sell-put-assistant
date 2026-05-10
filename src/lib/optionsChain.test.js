import { describe, expect, it } from 'vitest';
import { selectPutsForComparison } from './optionsChain';

describe('optionsChain selection', () => {
  it('filters puts by delta, DTE, bid/ask/mid and returns at most five rows', () => {
    const puts = [
      { symbol: 'A', strike: 250, bid: 8, ask: 8.4, mid: 8.2, delta: -0.42, dte: 45 },
      { symbol: 'B', strike: 245, bid: 6.1, ask: 6.3, mid: 6.2, delta: -0.3, dte: 45 },
      { symbol: 'C', strike: 240, bid: 4.1, ask: 4.3, mid: 4.2, delta: -0.22, dte: 45 },
      { symbol: 'D', strike: 235, bid: 2.6, ask: 2.8, mid: 2.7, delta: -0.16, dte: 45 },
      { symbol: 'E', strike: 230, bid: 1.8, ask: 2, mid: 1.9, delta: -0.15, dte: 21 },
      { symbol: 'F', strike: 225, bid: 1.2, ask: 1.4, mid: 1.3, delta: -0.18, dte: 61 },
      { symbol: 'G', strike: 220, bid: 0, ask: 1.1, mid: 0.55, delta: -0.2, dte: 45 },
      { symbol: 'H', strike: 215, bid: 0.7, ask: 0.9, mid: 0.8, delta: -0.19, dte: 45 },
      { symbol: 'I', strike: 210, bid: 0.6, ask: 0.8, mid: 0.7, delta: -0.17, dte: 45 },
    ];

    const rows = selectPutsForComparison(puts, 235, 5);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.sourceSymbol)).toEqual(['B', 'C', 'H', 'I', 'D']);
    expect(rows.every((row) => row.delta >= 0.15 && row.delta <= 0.3)).toBe(true);
    expect(rows.every((row) => row.dte >= 21 && row.dte <= 60)).toBe(true);
    expect(rows.every((row) => row.premium > 0)).toBe(true);
  });

  it('falls back to OTM strike selection when delta is unavailable', () => {
    const puts = [
      { symbol: 'A', strike: 260, bid: 9, ask: 9.4, mid: 9.2, delta: null, dte: 45 },
      { symbol: 'B', strike: 245, bid: 6.1, ask: 6.3, mid: 6.2, delta: null, dte: 45 },
      { symbol: 'C', strike: 240, bid: 4.1, ask: 4.3, mid: 4.2, delta: null, dte: 45 },
      { symbol: 'D', strike: 235, bid: 2.6, ask: 2.8, mid: 2.7, delta: null, dte: 45 },
    ];

    const rows = selectPutsForComparison(puts, 235, 3, 255);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.sourceSymbol)).toEqual(['D', 'C', 'B']);
    expect(rows.every((row) => row.delta === '')).toBe(true);
  });


  // ── dataQuality preference ───────────────────────────────────────────────────

  it('prefers bid_ask candidates over last_fallback when both are in range', () => {
    const puts = [
      { symbol: 'A', strike: 240, bid: 3.0, ask: 3.4, mid: 3.2, delta: -0.22, dte: 45, dataQuality: 'bid_ask' },
      { symbol: 'B', strike: 245, bid: 0, ask: 0, mid: 4.1, delta: -0.28, dte: 45, dataQuality: 'last_fallback' },
    ];
    const rows = selectPutsForComparison(puts, 235, 5);
    expect(rows.map((r) => r.sourceSymbol)).toContain('A');
    // last_fallback included only if no bid_ask candidates are available
    expect(rows.find((r) => r.sourceSymbol === 'B')).toBeUndefined();
  });

  it('returns empty when all puts have bid=0 and ask=0 (hasMarketQuote gate)', () => {
    const puts = [
      { symbol: 'A', strike: 240, bid: 0, ask: 0, mid: 3.2, delta: -0.22, dte: 45, dataQuality: 'last_fallback' },
    ];
    const rows = selectPutsForComparison(puts, 235, 5);
    expect(rows).toHaveLength(0);
  });

  it('excludes invalid dataQuality puts from selection', () => {
    const puts = [
      { symbol: 'A', strike: 240, bid: 0, ask: 0, mid: 0, delta: -0.22, dte: 45, dataQuality: 'invalid' },
      { symbol: 'B', strike: 245, bid: 3.0, ask: 3.4, mid: 3.2, delta: -0.28, dte: 45, dataQuality: 'bid_ask' },
    ];
    const rows = selectPutsForComparison(puts, 235, 5);
    expect(rows.find((r) => r.sourceSymbol === 'A')).toBeUndefined();
    expect(rows.find((r) => r.sourceSymbol === 'B')).toBeDefined();
  });

  it('passes through bid, ask, premiumSource, dataQuality, quoteDate fields', () => {
    const puts = [
      { symbol: 'A', strike: 240, bid: 3.0, ask: 3.4, mid: 3.2, delta: -0.22, dte: 45, dataQuality: 'bid_ask', premiumSource: 'bid_ask', quoteDate: '2026-05-07T20:00:00.000Z' },
    ];
    const rows = selectPutsForComparison(puts, 235, 5);
    expect(rows[0].bid).toBe(3.0);
    expect(rows[0].ask).toBe(3.4);
    expect(rows[0].dataQuality).toBe('bid_ask');
    expect(rows[0].premiumSource).toBe('bid_ask');
    expect(rows[0].quoteDate).toBe('2026-05-07T20:00:00.000Z');
  });
});
