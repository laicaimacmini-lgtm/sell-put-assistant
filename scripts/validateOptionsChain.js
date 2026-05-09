export function validateOptionsChain(response) {
  const errors = [];

  if (!response || typeof response !== 'object') {
    return ['Response must be an object'];
  }

  if (!response.ticker) errors.push('Missing response.ticker');
  if (!response.expiration) errors.push('Missing response.expiration');
  if (!response.source) errors.push('Missing response.source');
  if (!response.lastUpdated) errors.push('Missing response.lastUpdated');
  if (!Array.isArray(response.puts)) errors.push('response.puts must be an array');

  if (Array.isArray(response.puts)) {
    if (response.puts.length === 0) errors.push('No puts returned');

    response.puts.forEach((put, index) => {
      const prefix = `Invalid put format at index ${index}`;
      for (const field of ['strike', 'bid', 'ask', 'mid', 'dte']) {
        if (put[field] === undefined || put[field] === null || put[field] === '') {
          errors.push(`${prefix}: missing ${field}`);
        }
      }
      if (!Object.prototype.hasOwnProperty.call(put, 'delta')) {
        errors.push(`${prefix}: missing delta`);
      }
      if (put.mid !== undefined && typeof put.mid !== 'number') {
        errors.push(`${prefix}: mid must be a number`);
      }
      if (put.delta !== null && put.delta !== undefined && put.delta !== '') {
        const absDelta = Math.abs(Number(put.delta));
        if (!Number.isFinite(absDelta)) {
          errors.push(`${prefix}: delta must convert to a number when provided`);
        }
      }
      if (put.dte !== undefined && typeof put.dte !== 'number') {
        errors.push(`${prefix}: dte must be a number`);
      }
    });
  }

  return errors;
}
