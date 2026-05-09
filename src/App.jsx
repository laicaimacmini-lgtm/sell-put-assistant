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

const watchlist = ['QQQ', 'SMH', 'NVDA', 'MU', 'AVGO', 'MSFT', 'AMZN', 'QLD', 'JAAA'];

const initialForm = {
  ticker: 'SMH',
  currentPrice: 255,
  strike: 240,
  premium: 4.2,
  dte: 45,
  delta: 0.22,
  support: 235,
  target: 270,
  cash: 50000,
  contracts: 1,
  broker: 'E*Trade',
};

const brokerNotes = {
  'E*Trade': [
    'Confirm option level supports cash-secured puts.',
    'Use Sell to Open.',
    'Choose Put.',
    'Check expiration, strike, bid/ask spread, and limit price.',
    'Avoid market orders.',
    'Confirm cash required before submitting.',
  ],
  Fidelity: [
    'Use Sell to Open.',
    'Select Put contract.',
    'Use limit order.',
    'Confirm cash-secured requirement.',
    'Check assignment risk before expiration.',
  ],
  Other: [
    'Use sell-to-open put.',
    'Use limit order.',
    'Confirm assignment and cash requirement.',
  ],
};

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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function classifyDte(dte) {
  if (dte >= 30 && dte <= 45) return { label: 'Good', tone: 'good', text: '30-45 DTE fits the preferred wheel window.' };
  if (dte >= 21 && dte <= 60) return { label: 'Acceptable', tone: 'watch', text: 'DTE is workable, but less ideal than the 30-45 day window.' };
  return { label: 'Not Ideal', tone: 'danger', text: 'Expiration timing is outside the preferred range.' };
}

function classifyDelta(delta) {
  if (delta >= 0.15 && delta <= 0.3) return { label: 'Reasonable', tone: 'good', text: 'Delta is in the balanced income/risk range.' };
  if (delta > 0.3 && delta <= 0.4) return { label: 'Higher Risk', tone: 'watch', text: 'Premium may be richer, but assignment risk is higher.' };
  if (delta > 0.4) return { label: 'Aggressive', tone: 'danger', text: 'Delta is aggressive for a cash-secured put entry.' };
  return { label: 'Low Yield', tone: 'neutral', text: 'Delta is safer, but premium may be too thin.' };
}

function classifyStrike(strike, support) {
  const spread = Math.abs(strike - support) / Math.max(1, support);
  if (strike < support) return { label: 'Conservative', tone: 'good', text: 'Strike is below support.' };
  if (spread <= 0.02) return { label: 'Near Support', tone: 'watch', text: 'Strike is close to support. Confirm the level still holds.' };
  return { label: 'Above Support', tone: 'danger', text: 'Strike sits above support and may be aggressive.' };
}

function classifyRewardRisk(rr) {
  if (rr >= 2) return { label: 'Good', tone: 'good', text: 'Reward/risk is strong enough for a higher quality setup review.' };
  if (rr >= 1.5) return { label: 'Small Size Only', tone: 'watch', text: 'Reward/risk is acceptable only for a smaller observation-sized setup.' };
  return { label: 'Avoid Chasing', tone: 'danger', text: 'Reward/risk is below 1.5. Do not chase unless premium improves or strike moves lower.' };
}

function classifyCash(cashRequired, cash) {
  if (cashRequired > cash) return { label: 'Not Enough Cash', tone: 'danger', text: 'Cash requirement exceeds available cash.' };
  const usage = cash > 0 ? cashRequired / cash : 1;
  if (usage <= 0.2) return { label: 'Healthy', tone: 'good', text: 'Position size uses 20% or less of available cash.' };
  if (usage <= 0.4) return { label: 'Medium', tone: 'watch', text: 'Position size is meaningful. Keep total portfolio exposure in view.' };
  return { label: 'Heavy', tone: 'danger', text: 'Position size is heavy for one cash-secured put setup.' };
}

function getRating({ cashRule, rewardRiskRule, deltaRule, strikeRule, dteRule }) {
  if (cashRule.label === 'Not Enough Cash') return 'Not Enough Cash';
  if (rewardRiskRule.tone === 'danger') return 'Poor Risk/Reward';
  if (deltaRule.label === 'Aggressive' || strikeRule.label === 'Above Support') return 'Too Aggressive';
  if (rewardRiskRule.tone === 'good' && dteRule.tone === 'good' && cashRule.tone === 'good') return 'Good Setup';
  return 'Watchlist Only';
}

function getSuggestedAction(rating) {
  const actions = {
    'Good Setup': 'This looks like a reasonable 30-45 DTE cash-secured put candidate, but still confirm market trend, reward/risk, position sizing, and avoid selling after a sharp gap-down.',
    'Watchlist Only': 'Keep this on watch. The setup is not disqualified, but confirm market trend and consider smaller size unless reward/risk and cash usage improve.',
    'Too Aggressive': 'The setup is leaning aggressive. Consider a lower strike, better support confirmation, smaller contract count, or waiting for a cleaner market trend.',
    'Not Enough Cash': 'Cash requirement exceeds available cash. Do not place this trade as a cash-secured put.',
    'Poor Risk/Reward': 'Reward/risk is below 1.5. Avoid chasing this setup unless premium improves or strike moves lower.',
  };
  return actions[rating];
}

function Badge({ tone, children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Field({ label, name, value, onChange, type = 'number', step = '0.01' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} step={step} name={name} value={value} onChange={onChange} />
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

  const data = useMemo(() => {
    const currentPrice = toNumber(form.currentPrice);
    const strike = toNumber(form.strike);
    const premium = toNumber(form.premium);
    const dte = Math.max(0, toNumber(form.dte));
    const delta = toNumber(form.delta);
    const support = toNumber(form.support);
    const target = toNumber(form.target);
    const cash = toNumber(form.cash);
    const contracts = Math.max(0, Math.floor(toNumber(form.contracts)));

    const cashRequired = strike * 100 * contracts;
    const maxProfit = premium * 100 * contracts;
    const breakeven = strike - premium;
    const returnOnCash = cashRequired > 0 ? maxProfit / cashRequired : 0;
    const annualizedReturn = dte > 0 ? returnOnCash * 365 / dte : 0;
    const downsideBuffer = currentPrice > 0 ? (currentPrice - breakeven) / currentPrice : 0;
    const distanceToSupport = currentPrice > 0 ? (currentPrice - support) / currentPrice : 0;
    const reward = premium;
    const risk = Math.max(0.01, breakeven - support);
    const rewardRisk = reward / risk;
    const cashUsage = cash > 0 ? cashRequired / cash : 0;
    const upsideToTarget = currentPrice > 0 ? (target - currentPrice) / currentPrice : 0;

    const dteRule = classifyDte(dte);
    const deltaRule = classifyDelta(delta);
    const strikeRule = classifyStrike(strike, support);
    const rewardRiskRule = classifyRewardRisk(rewardRisk);
    const cashRule = classifyCash(cashRequired, cash);
    const rating = getRating({ cashRule, rewardRiskRule, deltaRule, strikeRule, dteRule });

    return {
      currentPrice,
      strike,
      premium,
      dte,
      delta,
      support,
      target,
      cash,
      contracts,
      cashRequired,
      maxProfit,
      breakeven,
      returnOnCash,
      annualizedReturn,
      downsideBuffer,
      distanceToSupport,
      rewardRisk,
      cashUsage,
      upsideToTarget,
      dteRule,
      deltaRule,
      strikeRule,
      rewardRiskRule,
      cashRule,
      rating,
    };
  }, [form]);

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
            <input type="text" name="ticker" value={form.ticker} onChange={updateField} />
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
              <select name="broker" value={form.broker} onChange={updateSelect}>
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
              <h2>{data.rating}</h2>
              <p>{getSuggestedAction(data.rating)}</p>
            </div>
            <div className={`rating-badge ${data.rating.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
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
            <li>Keep total portfolio exposure in view before adding correlated positions.</li>
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
