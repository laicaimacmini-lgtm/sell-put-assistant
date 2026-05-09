import { afterEach, describe, expect, it, vi } from 'vitest';
import { runSmokeOptionsProvider } from './smokeOptionsProvider.js';
import { validateOptionsChain } from './validateOptionsChain.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('options provider smoke test helpers', () => {
  it('passes the mock provider smoke test', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exitCode = await runSmokeOptionsProvider(['--ticker', 'SMH', '--expiration', '2026-06-19', '--provider', 'mock']);

    expect(exitCode).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toMatch(/Status: PASS/);
    expect(error).not.toHaveBeenCalled();
  });

  it('fails invalid or empty responses clearly', () => {
    expect(validateOptionsChain({
      ticker: 'SMH',
      expiration: '2026-06-19',
      source: 'mock',
      lastUpdated: new Date().toISOString(),
      puts: [],
    })).toContain('No puts returned');

    expect(validateOptionsChain({
      ticker: 'SMH',
      expiration: '2026-06-19',
      source: 'mock',
      lastUpdated: new Date().toISOString(),
      puts: [{ strike: 240, bid: 4.1, ask: 4.3, mid: '4.2', delta: 'bad', dte: '45' }],
    })).toEqual(expect.arrayContaining([
      'Invalid put format at index 0: mid must be a number',
      'Invalid put format at index 0: delta must convert to a number',
      'Invalid put format at index 0: dte must be a number',
    ]));
  });

  it('returns a clear failure when a real provider token is missing', async () => {
    vi.stubEnv('TRADIER_TOKEN', '');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exitCode = await runSmokeOptionsProvider(['--ticker', 'SMH', '--expiration', '2026-06-19', '--provider', 'tradier']);

    expect(exitCode).toBe(1);
    expect(log.mock.calls.flat().join('\n')).toMatch(/Status: FAIL/);
    expect(error.mock.calls.flat().join('\n')).toMatch(/TRADIER_TOKEN/i);
  });
});
