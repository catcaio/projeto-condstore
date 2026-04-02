import { logger } from '@/infra/logger';
import { getTudicoMemoryState } from './memory-store';
import { buildTudicoResponse } from './response-protocol';
import { tudicoToolsRegistry } from './tools-registry';
import type { TudicoQueryInput, TudicoResponse } from './types';

export async function runTudicoQuery(input: TudicoQueryInput): Promise<TudicoResponse> {
  const startedAt = Date.now();
  const state = await getTudicoMemoryState(input.tenantId);

  const warnings: string[] = [];
  let toolResult: unknown;

  if (input.tool) {
    const tool = tudicoToolsRegistry[input.tool];
    toolResult = tool(state, input.payload);
  } else {
    warnings.push('Nenhuma tool específica selecionada; retorno baseado no protocolo padrão.');
  }

  const response = buildTudicoResponse({
    state,
    query: input.query,
    toolResult,
    warnings,
  });

  logger.info('tudico_query_processed', {
    tenantId: input.tenantId,
    tool: input.tool ?? 'none',
    durationMs: Date.now() - startedAt,
    warnings: response.warnings.length,
  });

  return response;
}
