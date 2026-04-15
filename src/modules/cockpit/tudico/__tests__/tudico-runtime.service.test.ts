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
