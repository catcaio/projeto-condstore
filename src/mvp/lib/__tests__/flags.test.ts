import { describe, expect, it } from 'vitest';
import { MVP_FLAGS } from '../../config/flags';

describe('MVP_FLAGS', () => {
  it('exports all required flag keys', () => {
    expect(MVP_FLAGS).toHaveProperty('enabled');
    expect(MVP_FLAGS).toHaveProperty('publicLanding');
    expect(MVP_FLAGS).toHaveProperty('miniCockpit');
  });

  it('all flag values are booleans', () => {
    for (const [key, value] of Object.entries(MVP_FLAGS)) {
      expect(typeof value, `MVP_FLAGS.${key} should be boolean`).toBe('boolean');
    }
  });

  it('sub-flags follow the master enabled flag', () => {
    // publicLanding and miniCockpit are derived from MVP_ENABLED,
    // so they must always match the master flag.
    expect(MVP_FLAGS.publicLanding).toBe(MVP_FLAGS.enabled);
    expect(MVP_FLAGS.miniCockpit).toBe(MVP_FLAGS.enabled);
  });
});
