import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOptionsChain, mapTradierPut } from './optionsProvider.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockTradierResponse(body, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

describe('optionsProvider', () => {
  it('returns a clear error when Tradier token is missing', async () => {
    vi.stubEnv('OPTIONS_DATA_PROVIDER', 'tradier');
    vi.stubEnv('TRADIER_TOKEN', '');

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19' })).rejects.toThrow(/Missing TRADIER_TOKEN for Tradier provider/i);
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
      days_to_expiration: 45,
    }, { expiration: '2026-06-19' });

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

  it('fetches Tradier chains, filters calls, and maps array responses', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    vi.stubEnv('TRADIER_BASE_URL', 'https://sandbox.tradier.test/v1');
    mockTradierResponse({
      options: {
        option: [
          {
            symbol: 'SMH260619P00240000',
            option_type: 'put',
            strike: 240,
            bid: 4.1,
            ask: 4.3,
            last: 4.15,
            greeks: { delta: -0.22, mid_iv: 0.34 },
            open_interest: 1200,
            volume: 300,
            days_to_expiration: 45,
          },
          {
            symbol: 'SMH260619C00240000',
            option_type: 'call',
            strike: 240,
            bid: 8.1,
            ask: 8.4,
            greeks: { delta: 0.5 },
          },
        ],
      },
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'tradier' });

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/markets/options/chains?symbol=SMH&expiration=2026-06-19&greeks=true') }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          Accept: 'application/json',
        }),
      }),
    );
    expect(result.source).toBe('tradier');
    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({ strike: 240, mid: 4.2, delta: -0.22, iv: 0.34 }));
  });

  it('maps a single Tradier option object response', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    mockTradierResponse({
      options: {
        option: {
          symbol: 'MU260619P00115000',
          option_type: 'put',
          strike: '115',
          bid: '2.35',
          ask: '2.55',
          last: '2.45',
          greeks: { delta: '-0.22', smv_vol: '0.43' },
          open_interest: '1120',
          volume: '420',
          days_to_expiration: '38',
        },
      },
    });

    const result = await fetchOptionsChain({ ticker: 'MU', expiration: '2026-06-19', provider: 'tradier' });

    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({
      symbol: 'MU260619P00115000',
      strike: 115,
      bid: 2.35,
      ask: 2.55,
      mid: 2.45,
      delta: -0.22,
      iv: 0.43,
      openInterest: 1120,
      volume: 420,
      dte: 38,
    }));
  });

  it('returns a clear Tradier authentication error for 401', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'bad-token');
    mockTradierResponse({ error: 'Unauthorized' }, 401);

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'tradier' })).rejects.toThrow(/Tradier authentication failed/i);
  });

  it('returns a clear Tradier rejected request error for 400', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    mockTradierResponse({ error: 'Bad request' }, 400);

    await expect(fetchOptionsChain({ ticker: 'BAD', expiration: '2026-06-19', provider: 'tradier' })).rejects.toThrow(/Check ticker and expiration/i);
  });

  it('prompts for expiration checks when Tradier returns no puts', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    mockTradierResponse({ options: { option: [] } });

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'tradier' })).rejects.toThrow(/No puts returned. Check whether expiration is valid/i);
  });
});
