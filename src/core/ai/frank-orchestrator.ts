import { getAIProvider } from './llm-gateway';

export interface FrankRunInput {
  tenantId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface FrankRunResult {
  replyText: string;
  intent?: string;
  confidence?: number;
}

export class FrankOrchestrator {
  async run(input: FrankRunInput): Promise<FrankRunResult> {
    if (!input.tenantId) {
      throw new Error('tenantId is required to run Frank');
    }

    if (!input.message) {
      throw new Error('message is required to run Frank');
    }

    // TODO: Add intent classification, tool orchestration, and decision logging.
    const provider = await getAIProvider(input.tenantId);
    const response = await provider.chat({
      tenantId: input.tenantId,
      user: input.message,
      responseFormat: 'text',
    });

    return {
      replyText: response.text,
    };
  }
}

export const frankOrchestrator = new FrankOrchestrator();
