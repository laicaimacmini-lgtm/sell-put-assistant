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
});
