import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, Cloud, Database, Loader2, RefreshCw } from 'lucide-react';
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
  webull: 'Webull OpenAPI: candidate provider; API approval/subscription likely required',
};

function Badge({ tone, children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function defaultExpiration() {
  const date = new Date();
  date.setDate(date.getDate() + 45);
  return date.toISOString().slice(0, 10);
}

export default function RealOptionsPanel({ form, onUseComparisonRows, onChainFetched, onUseBrokerPrice, comparisonRowsSource }) {
  const [ticker, setTicker] = useState(form.ticker || 'SMH');
  const [expiration, setExpiration] = useState(defaultExpiration());
  const [provider, setProvider] = useState(() => getOptionsApiBase() ? 'marketdata' : 'mock');
  const [chain, setChain] = useState(null);
  const [expirations, setExpirations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceSyncMsg, setPriceSyncMsg] = useState('');
  const [expirationLoading, setExpirationLoading] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [autoLoading, setAutoLoading] = useState(false);
  const [chainApplied, setChainApplied] = useState(false);
  const [brokerPrice, setBrokerPrice] = useState('');
  const autoFetchKeyRef = useRef(null);
  const apiBase = getOptionsApiBase();

  function formatQuoteDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' });
  }

  function isStaleQuote(iso) {
    if (!iso) return false;
    return Date.now() - new Date(iso).getTime() > 4 * 60 * 60 * 1000;
  }

  const brokerPriceNum = parseFloat(brokerPrice);
  const validBrokerPrice = Number.isFinite(brokerPriceNum) && brokerPriceNum > 0;
  const brokerMismatch = chain?.underlyingPrice != null && validBrokerPrice
    && Math.abs(brokerPriceNum - chain.underlyingPrice) / chain.underlyingPrice > 0.01;

  const selectedRows = useMemo(
    () => selectPutsForComparison(chain?.puts || [], form.support, 5, form.currentPrice),
    [chain, form.support, form.currentPrice],
  );
  const deltaUnavailable = hasUnavailableDelta(chain?.puts || []);

  async function runFetchFlow({ currentTicker, currentExpiration, currentProvider, isRefresh = false }) {
    setError('');
    setChain(null);
    setPriceSyncMsg('');
    if (!isRefresh) setChainApplied(false);

    try {
      const expirationPayload = await fetchOptionsExpirations({ ticker: currentTicker, provider: currentProvider });
      const list = expirationPayload.expirations || [];
      setExpirations(list);
      const picked = pickExpiration(list);
      let exp = currentExpiration;
      if (picked) { setExpiration(picked); exp = picked; }

      const payload = await fetchOptionsChain({ ticker: currentTicker, expiration: exp, provider: currentProvider });
      setChain(payload);
      setLastUpdated(new Date().toLocaleTimeString());

      if (onChainFetched) {
        onChainFetched({ puts: payload.puts, underlyingPrice: payload.underlyingPrice ?? null, underlyingPriceSource: payload.underlyingPriceSource ?? null });
      }
      if (payload.underlyingPrice != null && payload.underlyingPriceSource === 'marketdata') {
        setPriceSyncMsg(`Updated current price from MarketData.app: $${Number(payload.underlyingPrice).toFixed(2)}`);
      } else if (payload.underlyingPrice != null && payload.underlyingPriceSource === 'estimated') {
        setPriceSyncMsg(`Estimated underlying price: $${Number(payload.underlyingPrice).toFixed(2)}`);
      } else {
        setPriceSyncMsg('Underlying price unavailable — current price not updated.');
      }

      return payload;
    } catch (fetchError) {
      setError(fetchError.message);
      return null;
    }
  }

  useEffect(() => {
    if (provider !== 'marketdata' || !apiBase || !ticker) return;
    const key = `${ticker}|${provider}|${apiBase}`;
    if (autoFetchKeyRef.current === key) return;
    autoFetchKeyRef.current = key;
    let cancelled = false;
    (async () => {
      setAutoLoading(true);
      setError('');
      try {
        const payload = await runFetchFlow({ currentTicker: ticker, currentExpiration: expiration, currentProvider: provider });
        if (!cancelled && payload && autoApply) {
          const rows = selectPutsForComparison(payload.puts || [], form.support, 5, form.currentPrice);
          if (rows.length > 0) {
            onUseComparisonRows(rows);
            setChainApplied(true);
          }
        }
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    })();
    return () => { cancelled = true; autoFetchKeyRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, provider, apiBase]);

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
    setPriceSyncMsg('');
    try {
      const payload = await fetchOptionsChain({ ticker, expiration, provider });
      setChain(payload);
      setLastUpdated(new Date().toLocaleTimeString());
      setChainApplied(false);
      if (onChainFetched) {
        onChainFetched({ puts: payload.puts, underlyingPrice: payload.underlyingPrice ?? null, underlyingPriceSource: payload.underlyingPriceSource ?? null });
      }
      if (payload.underlyingPrice != null && payload.underlyingPriceSource === 'marketdata') {
        setPriceSyncMsg(`Updated current price from MarketData.app: $${Number(payload.underlyingPrice).toFixed(2)}`);
      } else if (payload.underlyingPrice != null && payload.underlyingPriceSource === 'estimated') {
        setPriceSyncMsg(`Estimated underlying price: $${Number(payload.underlyingPrice).toFixed(2)}`);
      } else {
        setPriceSyncMsg('Underlying price unavailable — current price not updated.');
      }
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    const payload = await runFetchFlow({ currentTicker: ticker, currentExpiration: expiration, currentProvider: provider, isRefresh: true });
    if (payload && autoApply) {
      const rows = selectPutsForComparison(payload.puts || [], form.support, 5, form.currentPrice);
      if (rows.length > 0) {
        onUseComparisonRows(rows);
        setChainApplied(true);
      }
    }
    setLoading(false);
  }

  function handleUseRows() {
    if (selectedRows.length > 0) {
      onUseComparisonRows(selectedRows);
      setChainApplied(true);
    }
  }

  const showApplyPrompt = chain && !chainApplied && comparisonRowsSource === 'example' && selectedRows.length > 0;
  const showApplySuccess = chain && chainApplied && selectedRows.length > 0;

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
            <option value="webull">Webull OpenAPI</option>
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
        {chain && (
          <button type="button" className="fetch-button secondary" onClick={handleRefresh} disabled={loading || autoLoading || !apiBase} aria-label="Refresh MarketData">
            {loading || autoLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Refresh MarketData
          </button>
        )}
      </div>

      {(loading || autoLoading) && !chain && (
        <div className="provider-note">Auto-fetching options data…</div>
      )}

      {error && <div className="error-state">{error}</div>}
      {priceSyncMsg && <div className="price-sync-msg">{priceSyncMsg}</div>}
      {expirations.length > 0 && <div className="provider-note">{expirations.length} expirations available from {provider}.</div>}
      {lastUpdated && <div className="last-updated">Last updated: {lastUpdated}</div>}

      {chain?.source === 'marketdata' && (
        <div className="quote-diagnostics">
          <strong>MarketData Quote Diagnostics</strong>
          <div>
            Underlying: {chain.underlyingPrice != null ? `$${Number(chain.underlyingPrice).toFixed(2)}` : '—'}
            {' · '}
            Data as of: {formatQuoteDate(chain.quoteDate)}
          </div>
          {isStaleQuote(chain.quoteDate) && (
            <div className="stale-warning">
              <AlertTriangle size={14} /> Data may be delayed. Always confirm bid/ask with your broker before placing any trade.
            </div>
          )}
          <div>
            Valid bid/ask: {(chain.puts || []).filter(p => p.bid > 0 && p.ask > 0).length} /{' '}
            {(chain.puts || []).length} puts ·{' '}
            Last fallback: {(chain.puts || []).filter(p => p.dataQuality === 'last_fallback').length} ·{' '}
            Invalid: {(chain.puts || []).filter(p => p.dataQuality === 'invalid').length}
          </div>
          <div className="broker-price-row">
            <label className="field broker-price-field">
              <span>Broker observed price</span>
              <input
                type="number"
                aria-label="Broker observed underlying price"
                placeholder={chain.underlyingPrice != null ? `MarketData: ${chain.underlyingPrice}` : 'e.g. 568.05'}
                value={brokerPrice}
                onChange={e => setBrokerPrice(e.target.value)}
                step="0.01"
                min="0"
              />
            </label>
            <button type="button" className="fetch-button secondary broker-price-button" onClick={() => onUseBrokerPrice?.(brokerPriceNum)} disabled={!validBrokerPrice}>
              Use broker price as Current Price
            </button>
            {validBrokerPrice && (
              <div className="broker-authoritative-note">
                Using broker observed price for order-sensitive calculations. Broker quote is authoritative for order entry.
              </div>
            )}
            {brokerMismatch && (
              <div className="broker-mismatch-warning">
                <AlertTriangle size={14} /> Broker price ${Number(brokerPriceNum).toFixed(2)} differs from MarketData ${Number(chain.underlyingPrice).toFixed(2)} by more than 1%. Use your broker&apos;s live price for decisions.
              </div>
            )}
          </div>
        </div>
      )}

      {chain && (
        <div className="success-state">
          <div>
            <strong>{(chain.puts || []).length} puts fetched</strong>
            {selectedRows.length > 0 ? (
              <span>{selectedRows.length} candidates match the delta/DTE filters.</span>
            ) : (
              <span className="apply-note">No suitable candidates found for current filters.</span>
            )}
            {deltaUnavailable && <span>Delta unavailable for this provider. Comparison rows use an OTM/strike-based fallback.</span>}
          </div>

          {showApplyPrompt && (
            <div className="apply-prompt">
              Put chain fetched. Click &ldquo;Use in Comparison Table&rdquo; to replace the example rows with live candidates.
            </div>
          )}
          {showApplySuccess && (
            <div className="apply-success">
              Live candidates applied to comparison table.
            </div>
          )}

          <div className="success-actions">
            <button type="button" className="fetch-button secondary" onClick={handleUseRows} disabled={selectedRows.length === 0}>
              Use in Comparison Table
            </button>
            <label className="auto-apply-toggle">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={(e) => setAutoApply(e.target.checked)}
                aria-label="Auto apply comparison rows"
              />
              Auto apply on fetch
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
