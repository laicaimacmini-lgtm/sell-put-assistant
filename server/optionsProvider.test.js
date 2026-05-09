import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOptionsChain, mapTradierPut } from './optionsProvider.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('optionsProvider', () => {
  it('returns a clear error when a non-mock provider is missing a token', async () => {
    vi.stubEnv('OPTIONS_DATA_PROVIDER', 'tradier');
    vi.stubEnv('TRADIER_TOKEN', '');

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19' })).rejects.toThrow(/requires TRADIER_TOKEN/i);
  });

  it('returns mock puts by default', async () => {
    vi.stubEnv('OPTIONS_DATA_PROVIDER', 'mock');

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19' });

    expect(result.source).toBe('mock');
    expect(result.ticker).toBe('SMH');
    expect(result.puts.length).toBeGreaterThan(0);
    expect(result.puts[0]).toEqual(expect.objectContaining({
      symbol: expect.any(String),
      strike: expect.any(Number),
      bid: expect.any(Number),
      ask: expect.any(Number),
      mid: expect.any(Number),
      delta: expect.any(Number),
      dte: expect.any(Number),
    }));
  });

  it('maps Tradier put format into the unified puts shape', () => {
    const mapped = mapTradierPut({
      symbol: 'SMH260619P00240000',
      option_type: 'put',
      strike: 240,
      bid: 4.1,
      ask: 4.3,
      last: 4.15,
      greeks: { delta: -0.22, mid_iv: 0.34 },
      open_interest: 1200,
      volume: 300,
      dte: 45,
    });

    expect(mapped).toEqual({
      symbol: 'SMH260619P00240000',
      strike: 240,
      bid: 4.1,
      ask: 4.3,
      mid: 4.2,
      last: 4.15,
      delta: -0.22,
      iv: 0.34,
      openInterest: 1200,
      volume: 300,
      dte: 45,
    });
  });
});
