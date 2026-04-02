import { describe, expect, it } from 'vitest';

import { runTudicoQuery } from '@/modules/tudico/service';
import { tudicoToolsRegistry } from '@/modules/tudico/tools-registry';

describe('tudico tools registry', () => {
  it('contains all mandatory tools', () => {
    expect(Object.keys(tudicoToolsRegistry).sort()).toEqual([
      'audit_response_for_extrapolation',
      'compare_hypothesis_versions',
      'fetch_glossary_term',
      'get_claim_status',
      'list_open_questions',
      'map_concept_dependencies',
      'summarize_regime_state',
    ]);
  });
});

describe('runTudicoQuery', () => {
  it('returns epistemic protocol and tool result', async () => {
    const response = await runTudicoQuery({
      tenantId: 'tenant-test',
      query: 'estado do regime',
      tool: 'summarize_regime_state',
    });

    expect(response.protocol.baseEstabelecida.length).toBeGreaterThan(0);
    expect(response.epistemicBlocks.map((block) => block.label)).toEqual([
      'estabelecido',
      'plausível',
      'conjectural',
      'excessivo',
    ]);
    expect(response.toolResult).toMatchObject({ currentHypothesis: '0.2' });
  });
});
