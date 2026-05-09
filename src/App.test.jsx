import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  delete globalThis.__SELL_PUT_OPTIONS_API_BASE__;
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the Sell Put Assistant dashboard title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sell put assistant/i })).toBeInTheDocument();
  });

  it('shows the default SMH example', () => {
    render(<App />);
    expect(screen.getAllByDisplayValue('SMH')[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/current price/i)).toHaveDisplayValue('255');
  });

  it('shows Not Enough Cash after reducing available cash', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cashInput = screen.getByLabelText(/account cash available/i);
    await user.clear(cashInput);
    await user.type(cashInput, '10000');

    expect(screen.getAllByText(/not enough cash/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cash requirement exceeds available cash/i).length).toBeGreaterThan(0);
  });

  it('shows aggressive risk language after increasing delta', async () => {
    const user = userEvent.setup();
    render(<App />);

    const deltaInput = screen.getByLabelText(/^delta$/i);
    await user.clear(deltaInput);
    await user.type(deltaInput, '0.42');

    expect(screen.getAllByText(/aggressive|higher risk/i).length).toBeGreaterThan(0);
  });

  it('includes the education-only disclaimer', () => {
    render(<App />);
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });

  it('renders the strike comparison table with three default candidates', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /compare put strikes/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(3);
  });

  it('adds a row and resets back to the three examples', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /add row/i }));
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: /reset examples/i }));
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(3);
  });

  it('shows balanced setup guidance in the comparison area', () => {
    render(<App />);
    expect(screen.getAllByText(/best balanced setup|no perfect setup/i).length).toBeGreaterThan(0);
  });

  it('updates comparison risk flags when available cash is reduced', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cashInput = screen.getByLabelText(/account cash available/i);
    await user.clear(cashInput);
    await user.type(cashInput, '10000');

    expect(screen.getAllByText(/not enough cash/i).length).toBeGreaterThan(0);
  });

  it('renders the Real Options Data panel with local proxy guidance when no API base is configured', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /real options data/i })).toBeInTheDocument();
    expect(screen.getByText(/requires the local api proxy/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock: built-in sample data/i)).toBeInTheDocument();
  });

  it('shows provider descriptions when the provider dropdown changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/options provider/i), 'alphavantage');
    expect(screen.getByText(/Alpha Vantage: options endpoint is premium-required/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/options provider/i), 'yahoo');
    expect(screen.getByText(/Yahoo Finance: unofficial local-only fallback/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/options provider/i), 'marketdata');
    expect(screen.getByText(/MarketData.app: dedicated options market data API/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/options provider/i), 'tradier');
    expect(screen.getByText(/requires Tradier Brokerage\/API access/i)).toBeInTheDocument();
  });

  it('fetches mock options data and uses filtered puts in the comparison table', async () => {
    const user = userEvent.setup();
    globalThis.__SELL_PUT_OPTIONS_API_BASE__ = 'http://localhost:8787';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ticker: 'SMH',
        expiration: '2026-06-19',
        source: 'mock',
        lastUpdated: new Date().toISOString(),
        puts: [
          { symbol: 'SMH-A', strike: 245, bid: 6.1, ask: 6.3, mid: 6.2, last: 6.15, delta: -0.3, iv: 0.36, openInterest: 100, volume: 20, dte: 45 },
          { symbol: 'SMH-B', strike: 240, bid: 4.1, ask: 4.3, mid: 4.2, last: 4.15, delta: -0.22, iv: 0.34, openInterest: 100, volume: 20, dte: 45 },
          { symbol: 'SMH-C', strike: 235, bid: 2.6, ask: 2.8, mid: 2.7, last: 2.7, delta: -0.16, iv: 0.33, openInterest: 100, volume: 20, dte: 45 },
          { symbol: 'SMH-D', strike: 230, bid: 1.8, ask: 2.0, mid: 1.9, last: 1.9, delta: -0.12, iv: 0.32, openInterest: 100, volume: 20, dte: 45 },
        ],
      }),
    });

    render(<App />);
    await user.click(screen.getByRole('button', { name: /fetch put chain/i }));
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining('provider=mock') }));
    expect(await screen.findByText(/4 puts fetched/i)).toBeInTheDocument();
    expect(screen.getByText(/3 candidates match/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /use in comparison table/i }));
    expect(screen.getAllByTestId('comparison-row')).toHaveLength(3);
    expect(screen.getByLabelText(/Strike real-SMH-A/i)).toHaveDisplayValue('245');
  });

  it('fetches Yahoo expirations through the local proxy', async () => {
    const user = userEvent.setup();
    globalThis.__SELL_PUT_OPTIONS_API_BASE__ = 'http://localhost:8787';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ticker: 'SMH', source: 'yahoo', expirations: ['2026-06-19', '2026-06-26'] }),
    });

    render(<App />);
    await user.selectOptions(screen.getByLabelText(/options provider/i), 'yahoo');
    await user.click(screen.getByRole('button', { name: /fetch expirations/i }));

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining('/api/options-expirations?ticker=SMH&provider=yahoo') }));
    expect(await screen.findByText(/2 expirations available from yahoo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/options expiration/i)).toHaveDisplayValue('2026-06-19');
  });

  it('uses OTM fallback rows when fetched data has no delta', async () => {
    const user = userEvent.setup();
    globalThis.__SELL_PUT_OPTIONS_API_BASE__ = 'http://localhost:8787';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ticker: 'SMH',
        expiration: '2026-06-19',
        source: 'yahoo',
        lastUpdated: new Date().toISOString(),
        puts: [
          { symbol: 'SMH-Y1', strike: 245, bid: 6.1, ask: 6.3, mid: 6.2, last: 6.15, delta: null, iv: 0.36, openInterest: 100, volume: 20, dte: 45 },
          { symbol: 'SMH-Y2', strike: 240, bid: 4.1, ask: 4.3, mid: 4.2, last: 4.15, delta: null, iv: 0.34, openInterest: 100, volume: 20, dte: 45 },
          { symbol: 'SMH-Y3', strike: 235, bid: 2.6, ask: 2.8, mid: 2.7, last: 2.7, delta: null, iv: 0.33, openInterest: 100, volume: 20, dte: 45 },
        ],
      }),
    });

    render(<App />);
    await user.selectOptions(screen.getByLabelText(/options provider/i), 'yahoo');
    await user.click(screen.getByRole('button', { name: /fetch put chain/i }));

    expect(await screen.findByText(/Delta unavailable for this provider/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /use in comparison table/i }));
    expect(screen.getByLabelText(/Strike real-SMH-Y3/i)).toHaveDisplayValue('235');
  });


  it('syncs current price from MarketData.app underlyingPrice after fetch', async () => {
    const user = userEvent.setup();
    globalThis.__SELL_PUT_OPTIONS_API_BASE__ = 'http://localhost:8787';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ticker: 'SMH',
        expiration: '2026-06-19',
        source: 'marketdata',
        lastUpdated: new Date().toISOString(),
        underlyingPrice: 261.5,
        underlyingPriceSource: 'marketdata',
        puts: [
          { symbol: 'SMH-M1', strike: 240, bid: 4.1, ask: 4.3, mid: 4.2, last: 4.15, delta: -0.22, iv: 0.34, openInterest: 1200, volume: 300, dte: 45 },
        ],
      }),
    });

    render(<App />);
    await user.selectOptions(screen.getByLabelText(/options provider/i), 'marketdata');
    await user.click(screen.getByRole('button', { name: /fetch put chain/i }));

    await screen.findByText(/Updated current price from MarketData\.app/i);
    expect(screen.getByLabelText(/Current Price/i)).toHaveDisplayValue('261.5');
  });

  it('shows price unavailable message when underlyingPrice is null', async () => {
    const user = userEvent.setup();
    globalThis.__SELL_PUT_OPTIONS_API_BASE__ = 'http://localhost:8787';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ticker: 'SMH',
        expiration: '2026-06-19',
        source: 'marketdata',
        lastUpdated: new Date().toISOString(),
        underlyingPrice: null,
        underlyingPriceSource: null,
        puts: [
          { symbol: 'SMH-M1', strike: 240, bid: 4.1, ask: 4.3, mid: 4.2, last: 4.15, delta: -0.22, iv: 0.34, openInterest: 1200, volume: 300, dte: 45 },
        ],
      }),
    });

    render(<App />);
    await user.selectOptions(screen.getByLabelText(/options provider/i), 'marketdata');
    await user.click(screen.getByRole('button', { name: /fetch put chain/i }));

    expect(await screen.findByText(/Underlying price unavailable/i)).toBeInTheDocument();
  });

  it('shows quick fill support buttons and applies -5% fill', async () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /-5%/i });
    expect(btn).toBeInTheDocument();
    await userEvent.setup().click(btn);
    const expected = (255 * 0.95).toFixed(2);
    expect(screen.getByLabelText(/Support Level/i)).toHaveDisplayValue(expected);
  });

});
