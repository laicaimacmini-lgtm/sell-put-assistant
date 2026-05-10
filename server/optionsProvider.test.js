import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchOptionsChain,
  fetchOptionsExpirations,
  mapAlphaVantagePut,
  mapMarketDataPut,
  mapTradierPut,
  mapYahooPut,
} from './optionsProvider.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockProviderResponse(body, status = 200) {
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

  it('returns clear errors when Alpha Vantage and MarketData tokens are missing', async () => {
    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'alphavantage' })).rejects.toThrow(/Missing ALPHAVANTAGE_API_KEY/i);
    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'marketdata' })).rejects.toThrow(/Missing MARKETDATA_TOKEN/i);
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
    mockProviderResponse({
      options: {
        option: [
          { symbol: 'SMH260619P00240000', option_type: 'put', strike: 240, bid: 4.1, ask: 4.3, last: 4.15, greeks: { delta: -0.22, mid_iv: 0.34 }, open_interest: 1200, volume: 300, days_to_expiration: 45 },
          { symbol: 'SMH260619C00240000', option_type: 'call', strike: 240, bid: 8.1, ask: 8.4, greeks: { delta: 0.5 } },
        ],
      },
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'tradier' });

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/markets/options/chains?symbol=SMH&expiration=2026-06-19&greeks=true') }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token', Accept: 'application/json' }) }),
    );
    expect(result.source).toBe('tradier');
    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({ strike: 240, mid: 4.2, delta: -0.22, iv: 0.34 }));
  });

  it('maps a single Tradier option object response', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    mockProviderResponse({
      options: {
        option: { symbol: 'MU260619P00115000', option_type: 'put', strike: '115', bid: '2.35', ask: '2.55', last: '2.45', greeks: { delta: '-0.22', smv_vol: '0.43' }, open_interest: '1120', volume: '420', days_to_expiration: '38' },
      },
    });

    const result = await fetchOptionsChain({ ticker: 'MU', expiration: '2026-06-19', provider: 'tradier' });

    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({ strike: 115, bid: 2.35, ask: 2.55, mid: 2.45, delta: -0.22, iv: 0.43, openInterest: 1120, volume: 420, dte: 38 }));
  });

  it('maps Alpha Vantage defensive format and filters calls', async () => {
    vi.stubEnv('ALPHAVANTAGE_API_KEY', 'av-key');
    vi.stubEnv('ALPHAVANTAGE_BASE_URL', 'https://alpha.test/query');
    mockProviderResponse({
      data: [
        { contractID: 'SMH260619P00240000', type: 'put', strike: '240', bid: '4.10', ask: '4.30', last: '4.15', delta: '-0.22', implied_volatility: '0.34', open_interest: '1200', volume: '300', expiration: '2026-06-19' },
        { contractID: 'SMH260619C00240000', type: 'call', strike: '240', bid: '8.10', ask: '8.30', delta: '0.50' },
      ],
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'alphavantage' });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining('function=HISTORICAL_OPTIONS') }), expect.any(Object));
    expect(result.source).toBe('alphavantage');
    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({ symbol: 'SMH260619P00240000', strike: 240, mid: 4.2, delta: -0.22, iv: 0.34, openInterest: 1200, volume: 300 }));
  });

  it('maps Alpha Vantage put helper format', () => {
    expect(mapAlphaVantagePut({ symbol: 'X', option_type: 'put', strike: '100', bid_price: '1.00', ask_price: '1.20', last_price: '1.10', greeks: { delta: '-0.2', iv: '0.4' }, openInterest: '12', volume: '3', dte: '45' })).toEqual(expect.objectContaining({ symbol: 'X', strike: 100, mid: 1.1, delta: -0.2, iv: 0.4, openInterest: 12, volume: 3, dte: 45 }));
  });

  it('maps MarketData.app defensive format from array columns', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-key');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({
      optionSymbol: ['SMH260619P00240000', 'SMH260619C00240000'],
      side: ['put', 'call'],
      strike: [240, 240],
      bid: [4.1, 8.1],
      ask: [4.3, 8.3],
      last: [4.15, 8.2],
      delta: [-0.22, 0.5],
      iv: [0.34, 0.3],
      openInterest: [1200, 100],
      volume: [300, 10],
      dte: [45, 45],
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'marketdata' });

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/options/chain/SMH/?expiration=2026-06-19') }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer md-key', Accept: 'application/json' }) }),
    );
    expect(result.source).toBe('marketdata');
    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({ symbol: 'SMH260619P00240000', strike: 240, mid: 4.2, delta: -0.22, iv: 0.34, openInterest: 1200, volume: 300, dte: 45 }));
  });

  it('maps MarketData.app object helper format', () => {
    expect(mapMarketDataPut({ optionSymbol: 'X', side: 'put', strike: '100', bidPrice: '1.00', askPrice: '1.20', lastPrice: '1.10', delta: '-0.2', impliedVolatility: '0.4', oi: '12', volume: '3', dte: '45' })).toEqual(expect.objectContaining({ symbol: 'X', strike: 100, mid: 1.1, delta: -0.2, iv: 0.4, openInterest: 12, volume: 3, dte: 45 }));
  });



  it('maps Yahoo Finance puts without delta into the unified shape', () => {
    const mapped = mapYahooPut({
      contractSymbol: 'SMH260619P00240000',
      strike: 240,
      bid: 4.1,
      ask: 4.3,
      lastPrice: 4.15,
      impliedVolatility: 0.34,
      openInterest: 1200,
      volume: 300,
    }, { expiration: '2026-06-19' });

    expect(mapped).toEqual(expect.objectContaining({
      symbol: 'SMH260619P00240000',
      strike: 240,
      bid: 4.1,
      ask: 4.3,
      mid: 4.2,
      last: 4.15,
      delta: null,
      iv: 0.34,
      openInterest: 1200,
      volume: 300,
      dte: expect.any(Number),
    }));
  });

  it('fetches Yahoo chains and keeps delta unavailable without crashing', async () => {
    mockProviderResponse({
      optionChain: {
        result: [{
          options: [{
            puts: [
              { contractSymbol: 'SMH260619P00240000', strike: 240, bid: 4.1, ask: 4.3, lastPrice: 4.15, impliedVolatility: 0.34, openInterest: 1200, volume: 300 },
            ],
          }],
        }],
      },
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'yahoo' });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining('/SMH?date=') }), expect.any(Object));
    expect(result.source).toBe('yahoo');
    expect(result.puts).toHaveLength(1);
    expect(result.puts[0]).toEqual(expect.objectContaining({ strike: 240, mid: 4.2, delta: null }));
  });

  it('fetches Yahoo expirations from expiration timestamps', async () => {
    mockProviderResponse({
      optionChain: {
        result: [{ expirationDates: [1781827200, 1782432000] }],
      },
    });

    const result = await fetchOptionsExpirations({ ticker: 'SMH', provider: 'yahoo' });

    expect(result).toEqual({
      ticker: 'SMH',
      source: 'yahoo',
      expirations: ['2026-06-19', '2026-06-26'],
    });
  });

  it('returns a clear error when Alpha Vantage reports premium-only options access', async () => {
    vi.stubEnv('ALPHAVANTAGE_API_KEY', 'av-key');
    mockProviderResponse({ Information: 'This endpoint is only available to premium subscribers.' });

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'alphavantage' })).rejects.toThrow(/premium-required/i);
  });

  it('returns a clear Tradier authentication error for 401', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'bad-token');
    mockProviderResponse({ error: 'Unauthorized' }, 401);

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'tradier' })).rejects.toThrow(/Tradier authentication failed/i);
  });

  it('returns a clear Tradier rejected request error for 400', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    mockProviderResponse({ error: 'Bad request' }, 400);

    await expect(fetchOptionsChain({ ticker: 'BAD', expiration: '2026-06-19', provider: 'tradier' })).rejects.toThrow(/Check ticker and expiration/i);
  });

  it('prompts for expiration checks when Tradier returns no puts', async () => {
    vi.stubEnv('TRADIER_TOKEN', 'test-token');
    mockProviderResponse({ options: { option: [] } });

    await expect(fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'tradier' })).rejects.toThrow(/No puts returned. Check whether expiration is valid/i);
  });

  it('fetches MarketData.app expirations and maps them correctly', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-token');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({ s: 'ok', expirations: ['2026-06-20', '2026-07-18', '2026-08-21'] });

    const result = await fetchOptionsExpirations({ ticker: 'SMH', provider: 'marketdata' });

    expect(result).toEqual({
      ticker: 'SMH',
      source: 'marketdata',
      lastUpdated: expect.any(String),
      expirations: ['2026-06-20', '2026-07-18', '2026-08-21'],
    });
  });

  it('returns a clear error when MarketData.app returns no_data for expirations', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-token');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({ s: 'no_data' });

    await expect(fetchOptionsExpirations({ ticker: 'FAKE', provider: 'marketdata' })).rejects.toThrow(/No expirations returned/i);
  });

  it('returns a clear error when MarketData.app token is missing for expirations', async () => {
    await expect(fetchOptionsExpirations({ ticker: 'SMH', provider: 'marketdata' })).rejects.toThrow(/Missing MARKETDATA_TOKEN/i);
  });

  it('returns a clear auth error when MarketData.app returns 401 for expirations', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'bad-token');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({ error: 'Unauthorized' }, 401);

    await expect(fetchOptionsExpirations({ ticker: 'SMH', provider: 'marketdata' })).rejects.toThrow(/authentication failed/i);
  });


  it('includes underlyingPrice from MarketData.app columnar format', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-key');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({
      optionSymbol: ['SMH260619P00240000'],
      side: ['put'],
      strike: [240],
      bid: [4.1], ask: [4.3], last: [4.15],
      delta: [-0.22], iv: [0.34],
      openInterest: [1200], volume: [300], dte: [45],
      underlyingPrice: [257.5],
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'marketdata' });

    expect(result.underlyingPrice).toBe(257.5);
    expect(result.underlyingPriceSource).toBe('marketdata');
  });

  it('returns null underlyingPrice when field is absent from MarketData.app response', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-key');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({
      optionSymbol: ['SMH260619P00240000'],
      side: ['put'],
      strike: [240],
      bid: [4.1], ask: [4.3], last: [4.15],
      delta: [-0.22], iv: [0.34],
      openInterest: [1200], volume: [300], dte: [45],
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'marketdata' });

    expect(result.underlyingPrice).toBeNull();
    expect(result.underlyingPriceSource).toBeNull();
  });

  it('does not let NaN enter underlyingPrice from MarketData.app', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-key');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    mockProviderResponse({
      optionSymbol: ['SMH260619P00240000'],
      side: ['put'],
      strike: [240],
      bid: [4.1], ask: [4.3], last: [4.15],
      delta: [-0.22], iv: [0.34],
      openInterest: [1200], volume: [300], dte: [45],
      underlyingPrice: ['not-a-number'],
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'marketdata' });

    expect(result.underlyingPrice).toBeNull();
    expect(Number.isNaN(result.underlyingPrice)).toBe(false);
  });


  // ── dataQuality / premiumSource / quoteDate ─────────────────────────────────

  it('mapMarketDataPut returns premiumSource bid_ask when bid and ask are positive', () => {
    const result = mapMarketDataPut({ optionSymbol: 'X', side: 'put', strike: '100', bidPrice: '2.00', askPrice: '2.40', lastPrice: '2.10', delta: '-0.25', impliedVolatility: '0.35', oi: '10', volume: '5', dte: '30', updated: String(1778184000) });
    expect(result.premiumSource).toBe('bid_ask');
    expect(result.dataQuality).toBe('bid_ask');
  });

  it('mapMarketDataPut returns premiumSource last_fallback when bid/ask are zero', () => {
    const result = mapMarketDataPut({ optionSymbol: 'X', side: 'put', strike: '100', bidPrice: '0', askPrice: '0', lastPrice: '2.10', delta: '-0.25', impliedVolatility: '0.35', oi: '10', volume: '5', dte: '30' });
    expect(result.premiumSource).toBe('last_fallback');
    expect(result.dataQuality).toBe('last_fallback');
  });

  it('mapMarketDataPut returns premiumSource invalid when bid/ask/last are all absent', () => {
    const result = mapMarketDataPut({ optionSymbol: 'X', side: 'put', strike: '100', bidPrice: '0', askPrice: '0', lastPrice: '0', delta: '-0.25', impliedVolatility: '0.35', oi: '10', volume: '5', dte: '30' });
    expect(result.premiumSource).toBe('invalid');
    expect(result.dataQuality).toBe('invalid');
  });

  it('mapMarketDataPut includes quoteDate ISO string when updated unix is provided', () => {
    const unix = 1778184000; // 2026-05-07T20:00:00.000Z
    const result = mapMarketDataPut({ optionSymbol: 'X', side: 'put', strike: '100', bidPrice: '1.00', askPrice: '1.50', lastPrice: '1.20', delta: '-0.2', impliedVolatility: '0.3', oi: '5', volume: '2', dte: '40', updated: String(unix) });
    expect(result.quoteDate).toBe(new Date(unix * 1000).toISOString());
  });

  it('mapMarketDataPut quoteDate is null when updated is absent', () => {
    const result = mapMarketDataPut({ optionSymbol: 'X', side: 'put', strike: '100', bidPrice: '1.00', askPrice: '1.50', lastPrice: '1.20', delta: '-0.2', impliedVolatility: '0.3', oi: '5', volume: '2', dte: '40' });
    expect(result.quoteDate).toBeNull();
  });

  it('fetchOptionsChain includes top-level quoteDate from MarketData.app updated array', async () => {
    vi.stubEnv('MARKETDATA_TOKEN', 'md-key');
    vi.stubEnv('MARKETDATA_BASE_URL', 'https://marketdata.test/v1');
    const unix = 1778184000;
    mockProviderResponse({
      optionSymbol: ['SMH260619P00240000'],
      side: ['put'],
      strike: [240],
      bid: [3.0], ask: [3.4], last: [3.2],
      delta: [-0.20], iv: [0.30],
      openInterest: [800], volume: [200], dte: [45],
      underlyingPrice: [257.5],
      updated: [unix],
    });

    const result = await fetchOptionsChain({ ticker: 'SMH', expiration: '2026-06-19', provider: 'marketdata' });

    expect(result.quoteDate).toBe(new Date(unix * 1000).toISOString());
  });
});
