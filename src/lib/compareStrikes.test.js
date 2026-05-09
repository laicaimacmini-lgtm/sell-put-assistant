import { describe, expect, it } from 'vitest';
import { compareStrikes, initialForm } from './calculateSetup';

describe('compareStrikes', () => {
  it('calculates multiple candidate rows independently', () => {
    const result = compareStrikes(initialForm, [
      { id: 'a', strike: 245, premium: 6.2, delta: 0.3, dte: 45, support: 235, contracts: 1 },
      { id: 'b', strike: 240, premium: 4.2, delta: 0.22, dte: 45, support: 235, contracts: 1 },
    ]);

    const row245 = result.rows.find((row) => row.id === 'a');
    const row240 = result.rows.find((row) => row.id === 'b');

    expect(row245.cashRequired).toBe(24500);
    expect(row245.maxProfit).toBe(620);
    expect(row245.breakeven).toBeCloseTo(238.8, 5);
    expect(row240.cashRequired).toBe(24000);
    expect(row240.rewardRisk).toBeCloseTo(5.25, 5);
  });

  it('sorts candidates by reward/risk by default', () => {
    const result = compareStrikes(initialForm, [
      { id: 'lower-rr', strike: 245, premium: 6.2, delta: 0.3, dte: 45, support: 235, contracts: 1 },
      { id: 'higher-rr', strike: 240, premium: 4.2, delta: 0.22, dte: 45, support: 235, contracts: 1 },
    ]);

    expect(result.rows[0].id).toBe('higher-rr');
    expect(result.rows[0].rewardRisk).toBeGreaterThan(result.rows[1].rewardRisk);
  });

  it('chooses the best balanced setup instead of only the highest annualized return', () => {
    const result = compareStrikes(
      { ...initialForm, currentPrice: 100, cash: 100000, target: 110 },
      [
        { id: 'hot-premium', strike: 100, premium: 10, delta: 0.55, dte: 7, support: 50, contracts: 1 },
        { id: 'balanced', strike: 50, premium: 2, delta: 0.2, dte: 45, support: 49, contracts: 1 },
      ],
      'annualizedReturn',
    );

    expect(result.rows[0].id).toBe('hot-premium');
    expect(result.rows[0].annualizedReturn).toBeGreaterThan(result.rows[1].annualizedReturn);
    expect(result.bestId).toBe('balanced');
    expect(result.message).toBe('Best Balanced Setup');
  });

  it('marks not enough cash rows', () => {
    const result = compareStrikes({ ...initialForm, cash: 10000 }, [
      { id: 'cash-short', strike: 240, premium: 4.2, delta: 0.22, dte: 45, support: 235, contracts: 1 },
    ]);

    expect(result.rows[0].setupRating).toBe('Not Enough Cash');
    expect(result.rows[0].riskFlags.map((flag) => flag.label)).toContain('Not enough cash');
  });

  it('marks poor reward/risk rows as avoid candidates', () => {
    const result = compareStrikes(initialForm, [
      { id: 'poor-rr', strike: 240, premium: 4.2, delta: 0.22, dte: 45, support: 232, contracts: 1 },
    ]);

    expect(result.rows[0].rewardRisk).toBeLessThan(1.5);
    expect(result.rows[0].setupRating).toBe('Poor Risk/Reward');
    expect(result.rows[0].riskFlags.map((flag) => flag.label)).toContain('Avoid / poor R:R');
  });
});
