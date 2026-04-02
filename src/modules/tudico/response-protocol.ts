import type { TudicoMemoryState, TudicoResponse } from './types';

export function buildTudicoResponse(params: {
  state: TudicoMemoryState;
  query: string;
  toolResult?: unknown;
  warnings?: string[];
}): TudicoResponse {
  const latestHypothesis = params.state.hypothesisVersions[params.state.hypothesisVersions.length - 1];
  const inconsistentCount = params.state.inconsistencies.length;

  const protocol = {
    baseEstabelecida: params.state.masterDocument.summary,
    leituraHipoteseAtual: latestHypothesis
      ? `v${latestHypothesis.version}: ${latestHypothesis.summary}`
      : 'Sem hipótese registrada.',
    auditoriaCritica: inconsistentCount > 0
      ? `${inconsistentCount} inconsistência(s) ativas exigem revisão antes de concluir causalidade.`
      : 'Sem inconsistências abertas no recorte atual.',
  };

  return {
    protocol,
    epistemicBlocks: [
      {
        label: 'estabelecido',
        content: protocol.baseEstabelecida,
      },
      {
        label: 'plausível',
        content: `Consulta recebida: ${params.query}`,
      },
      {
        label: 'conjectural',
        content: 'Interpretações novas devem ser tratadas como hipótese até validação adicional.',
      },
      {
        label: 'excessivo',
        content: 'Evitar extrapolar para unificação total sem evidência explícita no corpus.',
      },
    ],
    toolResult: params.toolResult,
    warnings: params.warnings ?? [],
  };
}
