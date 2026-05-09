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
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { brokerNotes, calculateSetup, initialForm, toNumber, watchlist } from './lib/calculateSetup';

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

function Badge({ tone, children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
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

export default function App() {
  const [form, setForm] = useState(initialForm);
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
            <Field label="Resistance / Target" name="target" value={form.target} onChange={updateField} />
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
