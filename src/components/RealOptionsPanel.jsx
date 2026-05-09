import { useMemo, useState } from 'react';
import { CalendarDays, Cloud, Database, Loader2 } from 'lucide-react';
import {
  fetchOptionsChain,
  fetchOptionsExpirations,
  getOptionsApiBase,
  pickExpiration,
  hasUnavailableDelta,
  selectPutsForComparison,
} from '../lib/optionsChain';

const providerDescriptions = {
  mock: 'Mock: built-in sample data',
  yahoo: 'Yahoo Finance: unofficial local-only fallback; no Greeks/delta stability guarantee',
  alphavantage: 'Alpha Vantage: options endpoint is premium-required',
  marketdata: 'MarketData.app: dedicated options market data API',
  tradier: 'Tradier: optional; requires Tradier Brokerage/API access',
};

function Badge({ tone, children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function defaultExpiration() {
  const date = new Date();
  date.setDate(date.getDate() + 45);
  return date.toISOString().slice(0, 10);
}

export default function RealOptionsPanel({ form, onUseComparisonRows }) {
  const [ticker, setTicker] = useState(form.ticker || 'SMH');
  const [expiration, setExpiration] = useState(defaultExpiration());
  const [provider, setProvider] = useState('mock');
  const [chain, setChain] = useState(null);
  const [expirations, setExpirations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expirationLoading, setExpirationLoading] = useState(false);
  const apiBase = getOptionsApiBase();

  const selectedRows = useMemo(
    () => selectPutsForComparison(chain?.puts || [], form.support, 5, form.currentPrice),
    [chain, form.support, form.currentPrice],
  );
  const deltaUnavailable = hasUnavailableDelta(chain?.puts || []);

  async function handleFetchExpirations() {
    setExpirationLoading(true);
    setError('');
    try {
      const payload = await fetchOptionsExpirations({ ticker, provider });
      const list = payload.expirations || [];
      setExpirations(list);
      const auto = pickExpiration(list);
      if (auto) setExpiration(auto);
    } catch (fetchError) {
      setExpirations([]);
      setError(fetchError.message);
    } finally {
      setExpirationLoading(false);
    }
  }

  async function handleFetch() {
    setLoading(true);
    setError('');
    setChain(null);
    try {
      const payload = await fetchOptionsChain({ ticker, expiration, provider });
      setChain(payload);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleUseRows() {
    if (selectedRows.length > 0) onUseComparisonRows(selectedRows);
  }

  return (
    <section className="panel real-options-panel">
      <div className="real-options-header">
        <div>
          <h2><Cloud size={18} /> Real Options Data</h2>
          <p>Fetch a put chain through a local proxy, then use filtered puts in the comparison table.</p>
        </div>
        <Badge tone={chain?.source === 'mock' || !apiBase ? 'neutral' : 'good'}>
          {chain?.source || (apiBase ? 'proxy ready' : 'local proxy required')}
        </Badge>
      </div>

      {!apiBase && (
        <div className="proxy-note">
          Real options data requires the local API proxy. Run <code>npm run server</code> locally and set <code>VITE_OPTIONS_API_BASE=http://localhost:8787</code> for local development.
        </div>
      )}

      <div className="provider-note">{providerDescriptions[provider]}</div>

      <div className="real-options-grid">
        <label className="field">
          <span>Ticker</span>
          <input aria-label="Options ticker" type="text" value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} />
        </label>
        <label className="field">
          <span>Expiration</span>
          {expirations.length > 0 ? (
            <select aria-label="Options expiration" value={expiration} onChange={(event) => setExpiration(event.target.value)}>
              {expirations.map((date) => <option key={date} value={date}>{date}</option>)}
            </select>
          ) : (
            <input aria-label="Options expiration" type="date" value={expiration} onChange={(event) => setExpiration(event.target.value)} />
          )}
        </label>
        <label className="field">
          <span>Provider</span>
          <select aria-label="Options provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="mock">Mock</option>
            <option value="yahoo">Yahoo Finance</option>
            <option value="alphavantage">Alpha Vantage</option>
            <option value="marketdata">MarketData.app</option>
            <option value="tradier">Tradier</option>
          </select>
        </label>
        <button type="button" className="fetch-button secondary" onClick={handleFetchExpirations} disabled={expirationLoading || !apiBase}>
          {expirationLoading ? <Loader2 size={16} className="spin" /> : <CalendarDays size={16} />}
          Fetch Expirations
        </button>
        <button type="button" className="fetch-button" onClick={handleFetch} disabled={loading || !apiBase}>
          {loading ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
          Fetch Put Chain
        </button>
      </div>

      {error && <div className="error-state">{error}</div>}
      {expirations.length > 0 && <div className="provider-note">{expirations.length} expirations available from {provider}.</div>}
      {chain && (
        <div className="success-state">
          <div>
            <strong>{chain.puts.length} puts fetched</strong>
            <span>{selectedRows.length} candidates match the delta/DTE filters, or the OTM fallback when delta is unavailable.</span>
            {deltaUnavailable && <span>Delta unavailable for this provider. Comparison rows use an OTM/strike-based fallback.</span>}
          </div>
          <button type="button" className="fetch-button secondary" onClick={handleUseRows} disabled={selectedRows.length === 0}>
            Use in Comparison Table
          </button>
        </div>
      )}
    </section>
  );
}
