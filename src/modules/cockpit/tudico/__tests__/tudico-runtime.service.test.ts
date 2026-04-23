import { describe, expect, it } from 'vitest';
import { tudicoRuntimeService } from '../tudico-runtime.service';

describe('tudicoRuntimeService.auditResponse', () => {
  it('flags inflated language and analogy-as-mechanism', async () => {
    const result = await tudicoRuntimeService.auditResponse({
      responseText: 'Sem dúvida essa analogia prova definitivamente o mecanismo.',
      claimIds: ['claim-1'],
    });

    expect(result.claimIds).toEqual(['claim-1']);
    expect(result.alerts.some((alert) => alert.code === 'inflated_language')).toBe(true);
    expect(result.alerts.some((alert) => alert.code === 'analogy_as_mechanism')).toBe(true);
    expect(result.score).toBeLessThan(100);
  });
});

describe('tudicoRuntimeService.validateStatisticalSignal', () => {
  it('returns significant result when treatment outperforms control', async () => {
    const result = await tudicoRuntimeService.validateStatisticalSignal({
      controlSuccesses: 120,
      controlTotal: 500,
      treatmentSuccesses: 170,
      treatmentTotal: 500,
      confidenceLevel: 0.95,
      alternative: 'two-sided',
    });

    expect(result.treatmentRate).toBeGreaterThan(result.controlRate);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.isSignificant).toBe(true);
    expect(result.confidenceInterval.lower).toBeGreaterThan(0);
  });

  it('returns non-significant result when samples are close', async () => {
    const result = await tudicoRuntimeService.validateStatisticalSignal({
      controlSuccesses: 240,
      controlTotal: 1000,
      treatmentSuccesses: 250,
      treatmentTotal: 1000,
      confidenceLevel: 0.95,
      alternative: 'two-sided',
    });

    expect(result.pValue).toBeGreaterThan(0.05);
    expect(result.isSignificant).toBe(false);
    expect(result.confidenceInterval.lower).toBeLessThan(0);
    expect(result.confidenceInterval.upper).toBeGreaterThan(0);
  });
});
