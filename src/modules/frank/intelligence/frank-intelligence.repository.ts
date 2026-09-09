/**
 * FRK-8/008 — Frank intelligence persistence.
 *
 * Mirrors the FRK-9 store pattern: an `IntelligenceStore` interface, an
 * in-memory implementation (tests/dev) and a Drizzle/MySQL implementation.
 * Every read/write is tenant-scoped; cross-tenant access fails closed with
 * TenantMismatchError (same semantic as the execution store).
 *
 * The store persists SUGGESTIONS and FEEDBACK — it never executes actions.
 */
import type {
  FrankFeedback,
  FrankFeedbackOutcome,
  FrankSuggestion,
  FrankSurface,
} from './frank-intelligence.types';

export class TenantMismatchError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} does not belong to the requesting tenant`);
    this.name = 'TenantMismatchError';
  }
}

export class UnknownSuggestionError extends Error {
  constructor(suggestionId: string) {
    super(`unknown suggestion: ${suggestionId}`);
    this.name = 'UnknownSuggestionError';
  }
}

export class DuplicateSuggestionError extends Error {
  constructor(suggestionId: string) {
    super(`duplicate suggestion: ${suggestionId}`);
    this.name = 'DuplicateSuggestionError';
  }
}

export interface IntelligenceStore {
  saveSuggestion(suggestion: FrankSuggestion): Promise<void>;
  getSuggestion(args: { tenantId: string; suggestionId: string }): Promise<FrankSuggestion>;
  listSuggestions(args: { tenantId: string; surface?: FrankSurface }): Promise<FrankSuggestion[]>;
  saveFeedback(feedback: FrankFeedback): Promise<void>;
  /** Acceptance rate for a tenant: accepted / (accepted+rejected). */
  acceptanceRate(args: { tenantId: string }): Promise<{ accepted: number; rejected: number; rate: number | null }>;
}

// ─── In-memory store (same enforcement, no infra) ───────────────────────────

export class InMemoryIntelligenceStore implements IntelligenceStore {
  private suggestions = new Map<string, FrankSuggestion>();
  private feedbacks: FrankFeedback[] = [];

  async saveSuggestion(suggestion: FrankSuggestion): Promise<void> {
    if (!suggestion.id || !suggestion.tenantId) {
      throw new Error('suggestion id and tenantId are required');
    }
    if (this.suggestions.has(suggestion.id)) {
      throw new DuplicateSuggestionError(suggestion.id);
    }
    this.suggestions.set(suggestion.id, structuredClone(suggestion));
  }

  async getSuggestion(args: { tenantId: string; suggestionId: string }): Promise<FrankSuggestion> {
    const found = this.suggestions.get(args.suggestionId);
    if (!found) throw new UnknownSuggestionError(args.suggestionId);
    if (found.tenantId !== args.tenantId) {
      throw new TenantMismatchError('suggestion', args.suggestionId);
    }
    return structuredClone(found);
  }

  async listSuggestions(args: { tenantId: string; surface?: FrankSurface }): Promise<FrankSuggestion[]> {
    return structuredClone(
      [...this.suggestions.values()]
        .filter((s: FrankSuggestion) => s.tenantId === args.tenantId && (!args.surface || s.surface === args.surface))
        .sort((a: FrankSuggestion, b: FrankSuggestion) => b.confidence - a.confidence),
    );
  }

  async saveFeedback(feedback: FrankFeedback): Promise<void> {
    if (!feedback.id || !feedback.tenantId) {
      throw new Error('feedback id and tenantId are required');
    }
    const suggestion = this.suggestions.get(feedback.suggestionId);
    if (!suggestion) throw new UnknownSuggestionError(feedback.suggestionId);
    if (suggestion.tenantId !== feedback.tenantId) {
      throw new TenantMismatchError('suggestion', feedback.suggestionId);
    }
    this.feedbacks.push(structuredClone(feedback));
  }

  async acceptanceRate(args: { tenantId: string }): Promise<{ accepted: number; rejected: number; rate: number | null }> {
    const fromTenant = this.feedbacks.filter((f) => f.tenantId === args.tenantId);
    const accepted = fromTenant.filter((f) => f.outcome === 'accepted').length;
    const rejected = fromTenant.filter((f) => f.outcome === 'rejected').length;
    const decided = accepted + rejected;
    return { accepted, rejected, rate: decided === 0 ? null : accepted / decided };
  }
}

// ─── Drizzle store (MySQL/TiDB, lazy imports, tenant-scoped) ────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let intelligenceDb: any = null;

async function getIntelligenceDb(): Promise<any> {
  if (intelligenceDb) return intelligenceDb;
  const poolConfig = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!poolConfig) {
    throw new Error('DATABASE_URL is not defined');
  }
  const { default: mysql } = await import('mysql2/promise');
  const { drizzle } = await import('drizzle-orm/mysql2');
  const pool = mysql.createPool({ uri: poolConfig });
  intelligenceDb = drizzle(pool, { mode: 'default' });
  return intelligenceDb;
}

async function intelligenceTables() {
  const { frankSuggestions, frankFeedbacks } = await import('@/drizzle/schema');
  const { eq, and } = await import('drizzle-orm');
  return { frankSuggestions, frankFeedbacks, eq, and };
}

function rowToSuggestion(row: {
  id: string;
  tenantId: string;
  surface: FrankSurface;
  type: FrankSuggestion['type'];
  title: string;
  description: string;
  reason: string;
  confidence: string | number;
  actionJson: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}): FrankSuggestion {
  return {
    id: row.id,
    tenantId: row.tenantId,
    surface: row.surface,
    type: row.type,
    title: row.title,
    description: row.description,
    reason: row.reason,
    confidence: Number(row.confidence),
    action: row.actionJson ? (JSON.parse(row.actionJson) as FrankSuggestion['action']) : undefined,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}

export class DrizzleIntelligenceStore implements IntelligenceStore {
  async saveSuggestion(suggestion: FrankSuggestion): Promise<void> {
    const db = await getIntelligenceDb();
    const { frankSuggestions, eq } = await intelligenceTables();
    const existing = await db
      .select({ id: frankSuggestions.id })
      .from(frankSuggestions)
      .where(eq(frankSuggestions.id, suggestion.id));
    if (existing.length > 0) throw new DuplicateSuggestionError(suggestion.id);

    await db.insert(frankSuggestions).values({
      id: suggestion.id,
      tenantId: suggestion.tenantId,
      surface: suggestion.surface,
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      reason: suggestion.reason,
      confidence: String(suggestion.confidence),
      actionJson: suggestion.action ? JSON.stringify(suggestion.action) : null,
      createdAt: new Date(suggestion.createdAt),
      expiresAt: suggestion.expiresAt ? new Date(suggestion.expiresAt) : null,
    });
  }

  async getSuggestion(args: { tenantId: string; suggestionId: string }): Promise<FrankSuggestion> {
    const db = await getIntelligenceDb();
    const { frankSuggestions, eq, and } = await intelligenceTables();
    const rows = await db
      .select()
      .from(frankSuggestions)
      .where(and(eq(frankSuggestions.id, args.suggestionId), eq(frankSuggestions.tenantId, args.tenantId)));
    if (rows.length === 0) {
      const anyRows = await db.select({ tenantId: frankSuggestions.tenantId }).from(frankSuggestions).where(eq(frankSuggestions.id, args.suggestionId));
      if (anyRows.length > 0) throw new TenantMismatchError('suggestion', args.suggestionId);
      throw new UnknownSuggestionError(args.suggestionId);
    }
    return rowToSuggestion(rows[0]);
  }

  async listSuggestions(args: { tenantId: string; surface?: FrankSurface }): Promise<FrankSuggestion[]> {
    const db = await getIntelligenceDb();
    const { frankSuggestions, eq, and } = await intelligenceTables();
    const where = args.surface
      ? and(eq(frankSuggestions.tenantId, args.tenantId), eq(frankSuggestions.surface, args.surface))
      : eq(frankSuggestions.tenantId, args.tenantId);
    const rows = await db.select().from(frankSuggestions).where(where);
    return rows.map((r: Parameters<typeof rowToSuggestion>[0]) => rowToSuggestion(r)).sort((a: FrankSuggestion, b: FrankSuggestion) => b.confidence - a.confidence);
  }

  async saveFeedback(feedback: FrankFeedback): Promise<void> {
    await this.getSuggestion({ tenantId: feedback.tenantId, suggestionId: feedback.suggestionId });
    const db = await getIntelligenceDb();
    const { frankFeedbacks } = await intelligenceTables();
    await db.insert(frankFeedbacks).values({
      id: feedback.id,
      tenantId: feedback.tenantId,
      suggestionId: feedback.suggestionId,
      outcome: feedback.outcome,
      createdAt: new Date(feedback.createdAt),
    });
  }

  async acceptanceRate(args: { tenantId: string }): Promise<{ accepted: number; rejected: number; rate: number | null }> {
    const db = await getIntelligenceDb();
    const { frankFeedbacks, eq } = await intelligenceTables();
    const rows = await db
      .select({ outcome: frankFeedbacks.outcome })
      .from(frankFeedbacks)
      .where(eq(frankFeedbacks.tenantId, args.tenantId));
    const accepted = rows.filter((r: { outcome: FrankFeedbackOutcome }) => r.outcome === 'accepted').length;
    const rejected = rows.filter((r: { outcome: FrankFeedbackOutcome }) => r.outcome === 'rejected').length;
    const decided = accepted + rejected;
    return { accepted, rejected, rate: decided === 0 ? null : accepted / decided };
  }
}