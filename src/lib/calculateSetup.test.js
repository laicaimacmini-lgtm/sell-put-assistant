import { describe, expect, it } from 'vitest';
import { calculateSetup, initialForm } from './calculateSetup';

const baseInput = { ...initialForm };

describe('calculateSetup', () => {
  it('calculates the default SMH setup numbers', () => {
    const result = calculateSetup(baseInput);

    expect(result.cashRequired).toBe(24000);
    expect(result.maxProfit).toBe(420);
    expect(result.breakeven).toBeCloseTo(235.8, 5);
    expect(result.returnOnCash).toBeCloseTo(0.0175, 5);
    expect(result.annualizedReturn).toBeCloseTo(0.1419, 4);
    expect(result.rewardRisk).toBeCloseTo(5.25, 5);
    expect(['Good Setup', 'Watchlist Only', 'Too Aggressive']).toContain(result.setupRating);
    expect(result.setupRating).not.toBe('Poor Risk/Reward');
    expect(result.setupRating).not.toBe('Not Enough Cash');
  });

  it('flags poor risk/reward when breakeven is far above support', () => {
    const result = calculateSetup({ ...baseInput, support: 232 });

    expect(result.rewardRisk).toBeLessThan(1.5);
    expect(result.setupRating).toBe('Poor Risk/Reward');
    expect(result.suggestedAction).toMatch(/reward\/risk is below 1\.5|avoid chasing/i);
  });

  it('flags not enough cash when cash-secured requirement exceeds available cash', () => {
    const result = calculateSetup({ ...baseInput, strike: 240, contracts: 1, cash: 10000 });

    expect(result.cashRequired).toBe(24000);
    expect(result.setupRating).toBe('Not Enough Cash');
    expect(result.suggestedAction).toMatch(/cash requirement exceeds available cash/i);
  });

  it('flags aggressive delta and avoids calling it a clean setup', () => {
    const result = calculateSetup({ ...baseInput, delta: 0.42 });

    expect(result.deltaRule.label).toBe('Aggressive');
    expect(result.deltaRule.text).toMatch(/aggressive|risk/i);
    expect(['Too Aggressive', 'Watchlist Only', 'Poor Risk/Reward', 'Not Enough Cash']).toContain(result.setupRating);
  });

  it('flags DTE outside the preferred range', () => {
    const result = calculateSetup({ ...baseInput, dte: 7 });

    expect(result.dteRule.label).toBe('Not Ideal');
    expect(result.dteRule.text).toMatch(/outside the preferred range|not ideal|short/i);
  });

  it('flags heavy position sizing above 40 percent of available cash', () => {
    const result = calculateSetup({ ...baseInput, cash: 50000, strike: 240, contracts: 1 });

    expect(result.cashRequired / result.cash).toBeCloseTo(0.48, 5);
    expect(result.cashRule.label).toBe('Heavy');
    expect(result.cashRule.text).toMatch(/heavy|more than 40%/i);
    expect(result.sections.positionSizing.join(' ')).toMatch(/heavy|40%|48\.0%/i);
  });
});
