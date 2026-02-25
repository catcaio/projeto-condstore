import { describe, expect, it } from 'vitest';
import { extractAttributionTokenFromText } from '../token-parser';

describe('extractAttributionTokenFromText', () => {
  it('parses #t=<token>', () => {
    expect(extractAttributionTokenFromText('quero frete #t=abc_123')).toBe('abc_123');
  });

  it('parses t=<token>', () => {
    expect(extractAttributionTokenFromText('oi t=camp-xyz')).toBe('camp-xyz');
  });

  it('parses token:<token>', () => {
    expect(extractAttributionTokenFromText('token:refTOKEN_99')).toBe('refTOKEN_99');
  });
});
