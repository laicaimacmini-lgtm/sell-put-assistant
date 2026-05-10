import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  Gauge,
  Landmark,
  LineChart,
  Plus,
  RotateCcw,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import RealOptionsPanel from './components/RealOptionsPanel';
import {
  brokerNotes,
  calculateSetup,
  compareStrikes,
  defaultStrikeRows,
  initialForm,
  watchlist,
} from './lib/calculateSetup';

const numberFields = new Set([
  'currentPrice',
  'strike',
  'premium',
  'dte',
  'delta',
  'support',
  'target',
  'cash',
  'contracts',
]);
const comparisonFields = new Set(['strike', 'premium', 'delta', 'dte', 'support', 'contracts']);

function currency(value, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value, digits = 1) {
  return `${((Number.isFinite(value) ? value : 0) * 100).toFixed(digits)}%`;
}

function Badge({ tone, children, className = '' }) {
  return <span className={`badge ${tone} ${className}`.trim()}>{children}</span>;
}

function Field({ label, name, value, onChange, type = 'number', step = '0.01' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input aria-label={label} type={type} step={step} name={name} value={value} onChange={onChange} />
    </label>
  );
}

function RuleCard({ icon: Icon, title, rule }) {
  return (
    <div className="rule-card">
      <div className="rule-icon"><Icon size={18} /></div>
      <div>
        <div className="rule-heading">
          <span>{title}</span>
          <Badge tone={rule.tone}>{rule.label}</Badge>
        </div>
        <p>{rule.text}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={accent ? 'accent' : ''}>{value}</strong>
    </div>
  );
}

function ComparisonInput({ label, rowId, name, value, onChange, step = '0.01' }) {
  return (
    <input
      aria-label={`${label} ${rowId}`}
      className="table-input"
      type="number"
      step={step}
      value={value}
      onChange={(event) => onChange(rowId, name, event.target.value)}
    />
  );
}

function StrikeComparison({ form, rows, sortBy, onSortChange, onRowChange, onAddRow, onRemoveRow, onReset }) {
  const comparison = useMemo(() => compareStrikes(form, rows, sortBy), [form, rows, sortBy]);

  return (
    <section className="panel comparison-panel">
      <div className="comparison-header">
        <div>
          <h2>Compare Put Strikes</h2>
          <p>Compare multiple cash-secured put candidates before choosing a setup.</p>
        </div>
        <div className="comparison-actions">
          <label className="sort-control">
            <span>Sort by</span>
            <select aria-label="Sort by" value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
              <option value="rewardRisk">Reward/Risk</option>
              <option value="annualizedReturn">Annualized Return</option>
              <option value="downsideBuffer">Downside Buffer</option>
              <option value="cashRequired">Cash Required</option>
            </select>
          </label>
          <button type="button" className="icon-button text-button" onClick={onAddRow}>
            <Plus size={16} /> Add row
          </button>
          <button type="button" className="icon-button text-button" onClick={onReset}>
            <RotateCcw size={16} /> Reset examples
          </button>
        </div>
      </div>

      <div className="comparison-callout">
        <Badge tone={comparison.hasPerfectSetup ? 'good' : 'watch'} className="balanced-badge">
          {comparison.message}
        </Badge>
        <p>
          Balanced selection weighs reward/risk, delta, position size, strike vs support, and DTE. It is not a trade recommendation.
        </p>
      </div>

      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th className="numeric">Strike</th>
              <th className="numeric">Premium</th>
              <th className="numeric">Delta</th>
              <th className="numeric">DTE</th>
              <th className="numeric">Support</th>
              <th className="numeric">Contracts</th>
              <th className="numeric">Cash Required</th>
              <th className="numeric">Max Profit</th>
              <th className="numeric">Breakeven</th>
              <th className="numeric">Return Cash</th>
              <th className="numeric">Annualized</th>
              <th className="numeric">Downside Buffer</th>
              <th className="numeric">Reward/Risk</th>
              <th className="numeric">Position Size</th>
              <th>Rating</th>
              <th>Risk Flags</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row, index) => {
              const isBest = row.id === comparison.bestId;
              return (
                <tr key={row.id} data-testid="comparison-row" className={isBest ? 'best-row' : ''}>
                  <td>
                    <div className="candidate-cell">
                      <strong>#{index + 1}</strong>
                      {isBest && <Badge tone="good" className="balanced-badge">Best Balanced Setup</Badge>}
                    </div>
                  </td>
                  <td><ComparisonInput label="Strike" rowId={row.id} name="strike" value={row.source.strike} onChange={onRowChange} /></td>
                  <td>
                    <ComparisonInput label="Premium" rowId={row.id} name="premium" value={row.source.premium} onChange={onRowChange} />
                    {row.source.bid > 0 && row.source.ask > 0 && (
                      <div className="bid-ask-hint">Bid {row.source.bid} / Ask {row.source.ask}</div>
                    )}
                    {row.source.premiumSource === 'last_fallback' && (
                      <span className="last-fallback-badge">Last fallback</span>
                    )}
                  </td>
                  <td><ComparisonInput label="Delta" rowId={row.id} name="delta" value={row.source.delta} onChange={onRowChange} /></td>
                  <td><ComparisonInput label="DTE" rowId={row.id} name="dte" value={row.source.dte} onChange={onRowChange} step="1" /></td>
                  <td><ComparisonInput label="Support" rowId={row.id} name="support" value={row.source.support} onChange={onRowChange} /></td>
                  <td><ComparisonInput label="Contracts" rowId={row.id} name="contracts" value={row.source.contracts} onChange={onRowChange} step="1" /></td>
                  <td className="numeric">{currency(row.cashRequired, 0)}</td>
                  <td className="numeric">{currency(row.maxProfit, 0)}</td>
                  <td className="numeric">{currency(row.breakeven)}</td>
                  <td className="numeric">{percent(row.returnOnCash)}</td>
                  <td className="numeric">{percent(row.annualizedReturn)}</td>
                  <td className="numeric">{percent(row.downsideBuffer)}</td>
                  <td className="numeric strong-number">{row.rewardRisk.toFixed(2)}</td>
                  <td className="numeric">{percent(row.cashUsage)}</td>
                  <td><Badge tone={row.cashRule.tone === 'danger' || row.rewardRiskRule.tone === 'danger' ? 'danger' : row.setupRating === 'Good Setup' ? 'good' : 'watch'}>{row.setupRating}</Badge></td>
                  <td>
                    <div className="flag-list">
                      {row.riskFlags.length > 0 ? row.riskFlags.map((flag) => (
                        <Badge key={flag.label} tone={flag.tone}>{flag.label}</Badge>
                      )) : <Badge tone="neutral">No major flag</Badge>}
                    </div>
                  </td>
                  <td>
                    <button type="button" className="icon-button remove-button" aria-label={`Remove candidate ${row.id}`} onClick={() => onRemoveRow(row.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [comparisonRows, setComparisonRows] = useState(defaultStrikeRows);
  const [comparisonRowsSource, setComparisonRowsSource] = useState("example");
  const [sortBy, setSortBy] = useState('rewardRisk');
  const data = useMemo(() => calculateSetup(form), [form]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: numberFields.has(name) ? value : value.toUpperCase(),
    }));
  }

  function updateSelect(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateComparisonRow(rowId, name, value) {
    if (!comparisonFields.has(name)) return;
    setComparisonRows((current) => current.map((row) => (row.id === rowId ? { ...row, [name]: value } : row)));
  }

  function addComparisonRow() {
    setComparisonRows((current) => [
      ...current,
      {
        id: `candidate-${Date.now()}`,
        strike: form.strike,
        premium: form.premium,
        delta: form.delta,
        dte: form.dte,
        support: form.support,
        contracts: 1,
      },
    ]);
  }

  function removeComparisonRow(rowId) {
    setComparisonRows((current) => current.length > 1 ? current.filter((row) => row.id !== rowId) : current);
  }

  function resetComparisonRows() {
    setComparisonRows(defaultStrikeRows);
    setSortBy('rewardRisk');
    setComparisonRowsSource("example");
  }

  function useRealOptionsRows(rows) {
    setComparisonRows(rows);
    setSortBy('rewardRisk');
    setComparisonRowsSource("live");
  }

  function handleChainFetched({ underlyingPrice }) {
    if (underlyingPrice != null && Number.isFinite(underlyingPrice)) {
      setForm((current) => ({ ...current, currentPrice: underlyingPrice }));
    }
  }

  const supportStale = Number.isFinite(Number(form.currentPrice)) && Number.isFinite(Number(form.support))
    && (Number(form.support) < Number(form.currentPrice) * 0.7 || Number(form.support) > Number(form.currentPrice));
  const targetStale = Number.isFinite(Number(form.target)) && Number.isFinite(Number(form.currentPrice)) && Number(form.target) < Number(form.currentPrice);
  const comparisonStale = comparisonRowsSource === "example" || (
    comparisonRows.length > 0 &&
    Math.max(...comparisonRows.map((r) => Number(r.strike))) < Number(form.currentPrice) * 0.7
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <div className="eyebrow"><LineChart size={16} /> Personal workflow dashboard</div>
          <h1>Sell Put Assistant</h1>
          <p>A personal risk/reward helper for cash-secured puts and wheel strategy.</p>
        </div>
        <div className="disclaimer">
          <AlertTriangle size={18} />
          For education and personal workflow only. Not financial advice.
        </div>
      </section>

      <section className="watchlist" aria-label="Default watchlist">
        <span>Watchlist</span>
        {watchlist.map((ticker) => (
          <button key={ticker} type="button" onClick={() => setForm((current) => ({ ...current, ticker }))}>
            {ticker}
          </button>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel input-panel">
          <div className="panel-title">
            <div>
              <h2>Trade Inputs</h2>
              <p>Manual inputs only. No brokerage API, no auto trading.</p>
            </div>
            <Badge tone="neutral">MVP</Badge>
          </div>

          <label className="field ticker-field">
            <span>Ticker</span>
            <input aria-label="Ticker" type="text" name="ticker" value={form.ticker} onChange={updateField} />
          </label>

          <div className="form-grid">
            <Field label="Current Price" name="currentPrice" value={form.currentPrice} onChange={updateField} />
            <Field label="Target Put Strike" name="strike" value={form.strike} onChange={updateField} />
            <Field label="Premium Received" name="premium" value={form.premium} onChange={updateField} />
            <Field label="Days to Expiration" name="dte" value={form.dte} onChange={updateField} step="1" />
            <Field label="Delta" name="delta" value={form.delta} onChange={updateField} />
            <Field label="Support Level" name="support" value={form.support} onChange={updateField} />
            <div className="quick-fill-row">
              {[0.03, 0.05, 0.08, 0.10].map((pct) => {
                const quick = (Number(form.currentPrice) * (1 - pct)).toFixed(2);
                return (
                  <button key={pct} type="button" className="quick-fill-btn" title={`Support at -${(pct * 100).toFixed(0)}% of current price`}
                    onClick={() => setForm((c) => ({ ...c, support: Number(quick) }))}>
                    -{(pct * 100).toFixed(0)}%
                  </button>
                );
              })}
            </div>
            {supportStale && (
              <div className="support-stale-warning">
                Support level may be stale — check that it reflects current chart context.
              </div>
            )}
            <Field label="Resistance / Target" name="target" value={form.target} onChange={updateField} />
            <div className="quick-fill-row">
              {[0.03, 0.05, 0.08, 0.10].map((pct) => {
                const quick = (Number(form.currentPrice) * (1 + pct)).toFixed(2);
                return (
                  <button key={pct} type="button" className="quick-fill-btn quick-fill-btn--up"
                    title={`Target at +${(pct * 100).toFixed(0)}% of current price. Planning helper only.`}
                    onClick={() => setForm((c) => ({ ...c, target: Number(quick) }))}>
                    +{(pct * 100).toFixed(0)}%
                  </button>
                );
              })}
            </div>
            {targetStale && (
              <div className="target-stale-warning">
                Target is below current price. Check whether this value belongs to an old example.
              </div>
            )}
            <Field label="Account Cash Available" name="cash" value={form.cash} onChange={updateField} step="100" />
            <Field label="Contract Count" name="contracts" value={form.contracts} onChange={updateField} step="1" />
            <label className="field">
              <span>Broker</span>
              <select aria-label="Broker" name="broker" value={form.broker} onChange={updateSelect}>
                <option>E*Trade</option>
                <option>Fidelity</option>
                <option>Other</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel output-panel">
          <div className="rating-card">
            <div>
              <span className="section-label">Setup Rating</span>
              <h2>{data.setupRating}</h2>
              <p>{data.suggestedAction}</p>
            </div>
            <div className={`rating-badge ${data.setupRating.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <Gauge size={22} />
              {data.rewardRisk.toFixed(2)} R/R
            </div>
          </div>

          <div className="metrics-grid">
            <Metric label="Cash Required" value={currency(data.cashRequired, 0)} accent />
            <Metric label="Max Profit" value={currency(data.maxProfit, 0)} />
            <Metric label="Breakeven" value={currency(data.breakeven)} />
            <Metric label="Return on Cash" value={percent(data.returnOnCash)} />
            <Metric label="Annualized Return" value={percent(data.annualizedReturn)} />
            <Metric label="Downside Buffer" value={percent(data.downsideBuffer)} />
            <Metric label="Distance to Support" value={percent(data.distanceToSupport)} />
            <Metric label="Cash Usage" value={percent(data.cashUsage)} />
          </div>

          <div className="warning-card">
            <AlertTriangle size={20} />
            <div>
              <strong>Risk Notes</strong>
              <p>
                This tool separates market trend, reward/risk, position sizing, and cash requirement. Do not treat any single signal as a trade instruction.
              </p>
            </div>
          </div>
        </section>
      </div>

      <RealOptionsPanel form={form} onUseComparisonRows={useRealOptionsRows} onChainFetched={handleChainFetched} comparisonRowsSource={comparisonRowsSource} />

      {comparisonStale && (
        <div className="comparison-stale-warning">
          Comparison rows look stale — they may be example data not reflecting the current price. Use &ldquo;Use in Comparison Table&rdquo; after fetching live data, or update strikes manually.
        </div>
      )}
      <StrikeComparison
        form={form}
        rows={comparisonRows}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onRowChange={updateComparisonRow}
        onAddRow={addComparisonRow}
        onRemoveRow={removeComparisonRow}
        onReset={resetComparisonRows}
      />

      <section className="analysis-grid">
        <RuleCard icon={ClipboardCheck} title="DTE" rule={data.dteRule} />
        <RuleCard icon={Target} title="Delta" rule={data.deltaRule} />
        <RuleCard icon={ShieldCheck} title="Strike vs Support" rule={data.strikeRule} />
        <RuleCard icon={BadgeDollarSign} title="Reward/Risk" rule={data.rewardRiskRule} />
        <RuleCard icon={DollarSign} title="Cash Requirement" rule={data.cashRule} />
      </section>

      <section className="detail-grid">
        <article className="panel compact-panel">
          <h3><BarChart3 size={18} /> Market Trend Checklist</h3>
          <ul>
            <li>Confirm broad market trend before opening a new position.</li>
            <li>Avoid selling puts immediately after a sharp gap-down without support confirmation.</li>
            <li>Use support and resistance as context, not as a standalone buy/sell signal.</li>
            <li>Target level is {currency(data.target)} with current upside context of {percent(data.upsideToTarget)}.</li>
          </ul>
        </article>

        <article className="panel compact-panel">
          <h3><BriefcaseBusiness size={18} /> Position Sizing Notes</h3>
          <ul>
            <li>Cash required is {currency(data.cashRequired, 0)} for {data.contracts} contract(s).</li>
            <li>Current cash usage is {percent(data.cashUsage)} of available cash.</li>
            <li>{data.cashRule.text}</li>
          </ul>
        </article>

        <article className="panel compact-panel">
          <h3><TrendingUp size={18} /> Reward/Risk Notes</h3>
          <ul>
            <li>Reward/risk is {data.rewardRisk.toFixed(2)} using premium divided by breakeven-to-support risk.</li>
            <li>2.0 or higher is the preferred quality threshold.</li>
            <li>1.5 to 2.0 is watchlist or small-size only. Below 1.5 is not worth chasing.</li>
          </ul>
        </article>

        <article className="panel compact-panel">
          <h3><Landmark size={18} /> Broker Execution Notes</h3>
          <ul>
            {brokerNotes[form.broker].map((note) => <li key={note}>{note}</li>)}
          </ul>
        </article>
      </section>

      <footer>
        <CheckCircle2 size={16} /> Personal education tool. No recommendations, no guarantees, no automated trading.
      </footer>
    </main>
  );
}
