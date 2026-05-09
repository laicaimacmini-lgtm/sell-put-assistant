export const watchlist = ['QQQ', 'SMH', 'NVDA', 'MU', 'AVGO', 'MSFT', 'AMZN', 'QLD', 'JAAA'];

export const initialForm = {
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

export const brokerNotes = {
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

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function classifyDte(dte) {
  if (dte >= 30 && dte <= 45) return { label: 'Good', tone: 'good', text: '30-45 DTE fits the preferred wheel window.' };
  if (dte >= 21 && dte <= 60) return { label: 'Acceptable', tone: 'watch', text: 'DTE is workable, but less ideal than the 30-45 day window.' };
  return { label: 'Not Ideal', tone: 'danger', text: 'Expiration timing is outside the preferred range.' };
}

export function classifyDelta(delta) {
  if (delta >= 0.15 && delta <= 0.3) return { label: 'Reasonable', tone: 'good', text: 'Delta is in the balanced income/risk range.' };
  if (delta > 0.3 && delta <= 0.4) return { label: 'Higher Risk', tone: 'watch', text: 'Premium may be richer, but assignment risk is higher.' };
  if (delta > 0.4) return { label: 'Aggressive', tone: 'danger', text: 'Delta is aggressive for a cash-secured put entry.' };
  return { label: 'Low Yield', tone: 'neutral', text: 'Delta is safer, but premium may be too thin.' };
}

export function classifyStrike(strike, support) {
  const spread = Math.abs(strike - support) / Math.max(1, support);
  if (strike < support) return { label: 'Conservative', tone: 'good', text: 'Strike is below support.' };
  if (spread <= 0.03) return { label: 'Near Support', tone: 'watch', text: 'Strike is close to support. Confirm the level still holds.' };
  return { label: 'Above Support', tone: 'danger', text: 'Strike sits above support and may be aggressive.' };
}

export function classifyRewardRisk(rewardRisk) {
  if (rewardRisk >= 2) return { label: 'Good', tone: 'good', text: 'Reward/risk is strong enough for a higher quality setup review.' };
  if (rewardRisk >= 1.5) return { label: 'Small Size Only', tone: 'watch', text: 'Reward/risk is acceptable only for a smaller observation-sized setup.' };
  return { label: 'Avoid Chasing', tone: 'danger', text: 'Reward/risk is below 1.5. Do not chase unless premium improves or strike moves lower.' };
}

export function classifyCash(cashRequired, cash) {
  if (cashRequired > cash) return { label: 'Not Enough Cash', tone: 'danger', text: 'Cash requirement exceeds available cash.' };
  const usage = cash > 0 ? cashRequired / cash : 1;
  if (usage <= 0.2) return { label: 'Healthy', tone: 'good', text: 'Position size uses 20% or less of available cash.' };
  if (usage <= 0.4) return { label: 'Medium', tone: 'watch', text: 'Position size is meaningful. Keep total portfolio exposure in view.' };
  return { label: 'Heavy', tone: 'danger', text: 'Position is heavy at more than 40% of available cash.' };
}

export function getRating({ cashRule, rewardRiskRule, deltaRule, strikeRule, dteRule }) {
  if (cashRule.label === 'Not Enough Cash') return 'Not Enough Cash';
  if (rewardRiskRule.tone === 'danger') return 'Poor Risk/Reward';
  if (deltaRule.label === 'Aggressive' || strikeRule.label === 'Above Support') return 'Too Aggressive';
  if (rewardRiskRule.tone === 'good' && dteRule.tone === 'good' && cashRule.tone === 'good') return 'Good Setup';
  return 'Watchlist Only';
}

export function getSuggestedAction(setupRating) {
  const actions = {
    'Good Setup': 'This looks like a reasonable 30-45 DTE cash-secured put candidate, but still confirm market trend, reward/risk, position sizing, and avoid selling after a sharp gap-down.',
    'Watchlist Only': 'Keep this on watch. The setup is not disqualified, but confirm market trend and consider smaller size unless reward/risk and cash usage improve.',
    'Too Aggressive': 'The setup is leaning aggressive. Consider a lower strike, better support confirmation, smaller contract count, or waiting for a cleaner market trend.',
    'Not Enough Cash': 'Cash requirement exceeds available cash. Do not place this trade as a cash-secured put.',
    'Poor Risk/Reward': 'Reward/risk is below 1.5. Avoid chasing this setup unless premium improves or strike moves lower.',
  };
  return actions[setupRating];
}

export function calculateSetup(input) {
  const currentPrice = toNumber(input.currentPrice);
  const strike = toNumber(input.strike);
  const premium = toNumber(input.premium);
  const dte = Math.max(0, toNumber(input.dte));
  const delta = toNumber(input.delta);
  const support = toNumber(input.support);
  const target = toNumber(input.target);
  const cash = toNumber(input.cash);
  const contracts = Math.max(0, Math.floor(toNumber(input.contracts)));

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
  const setupRating = getRating({ cashRule, rewardRiskRule, deltaRule, strikeRule, dteRule });
  const suggestedAction = getSuggestedAction(setupRating);

  const riskNotes = [
    'Market trend, reward/risk, position sizing, and cash requirement must be reviewed separately.',
    rewardRiskRule.text,
    cashRule.text,
    deltaRule.text,
  ];

  const checks = {
    dte: dteRule,
    delta: deltaRule,
    strike: strikeRule,
    rewardRisk: rewardRiskRule,
    cash: cashRule,
  };

  const sections = {
    marketTrend: [
      'Confirm broad market trend before opening a new position.',
      'Avoid selling puts immediately after a sharp gap-down without support confirmation.',
      'Use support and resistance as context, not as a standalone buy/sell signal.',
    ],
    positionSizing: [
      `Cash required is ${cashRequired} for ${contracts} contract(s).`,
      `Current cash usage is ${(cashUsage * 100).toFixed(1)}% of available cash.`,
      cashRule.text,
    ],
    rewardRisk: [
      `Reward/risk is ${rewardRisk.toFixed(2)} using premium divided by breakeven-to-support risk.`,
      '2.0 or higher is the preferred quality threshold.',
      '1.5 to 2.0 is watchlist or small-size only. Below 1.5 is not worth chasing.',
    ],
  };

  return {
    ticker: input.ticker,
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
    checks,
    sections,
    riskNotes,
    setupRating,
    suggestedAction,
    rating: setupRating,
  };
}
