/**
 * Frank Model Registry
 *
 * Formaliza versão do Frank como entidade explícita.
 * Usado para rastreamento de datasets e compatibilidade de modelos.
 */

export type FrankModelVersion = {
  /** Identificador único (ex: frank-v1.0.0) */
  id: string;

  /** Model ID (ex: qwen2.5-7b-instruct-1m) */
  modelId: string;

  /** Embedding model ID (ex: text-embedding-nomic-embed-text-v1.5) */
  embedModelId: string;

  /** Dataset version tag (ex: frank-events/v1) */
  datasetVersion: string;

  /** Git commit SHA para rastreamento */
  gitCommit: string;

  /** Data de criação/ativação da versão */
  createdAt: string;

  /** Notas opcionais sobre mudanças */
  notes?: string;
};

/**
 * Versão padrão do Frank (fallback quando FRANK_MODEL_VERSION não está configurado).
 * Atualizar quando houver changes no modelo ou dataset.
 */
const DEFAULT_FRANK_MODEL: FrankModelVersion = {
  id: 'frank-v1.0.0',
  modelId: 'qwen2.5-7b-instruct-1m',
  embedModelId: 'text-embedding-nomic-embed-text-v1.5',
  datasetVersion: 'frank-events/v1',
  gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  createdAt: '2026-02-24T22:00:00Z',
  notes: 'Initial Frank model with Qwen 2.5 7B and Nomic embeddings',
};

/**
 * Parse FRANK_MODEL_VERSION from environment.
 * Format: frank-v1.0.0;qwen2.5-7b-instruct-1m;text-embedding-nomic-embed-text-v1.5;frank-events/v1
 *
 * Returns null if parsing fails (will use default).
 */
function parseFrankModelVersion(envValue: string): FrankModelVersion | null {
  try {
    const parts = envValue.split(';').map((p) => p.trim());
    if (parts.length < 4) return null;

    return {
      id: parts[0],
      modelId: parts[1],
      embedModelId: parts[2],
      datasetVersion: parts[3],
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      createdAt: new Date().toISOString(),
      notes: parts[4] || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Get the active Frank model version.
 * Reads from FRANK_MODEL_VERSION env or uses DEFAULT_FRANK_MODEL.
 */
export function getActiveFrankModel(): FrankModelVersion {
  const envValue = process.env.FRANK_MODEL_VERSION?.trim();
  if (envValue) {
    const parsed = parseFrankModelVersion(envValue);
    if (parsed) {
      return parsed;
    }
  }
  return DEFAULT_FRANK_MODEL;
}

/**
 * Get model version ID for logging/tracking.
 * Shorthand for getActiveFrankModel().id
 */
export function getFrankModelVersionId(): string {
  return getActiveFrankModel().id;
}
