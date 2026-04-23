import { z } from 'zod';

export const hypothesisEpistemicLevelSchema = z.enum(['evidence', 'inference', 'speculation']);
export type HypothesisEpistemicLevel = z.infer<typeof hypothesisEpistemicLevelSchema>;

export const claimReferenceClassSchema = z.enum(['primary', 'secondary', 'derived']);
export type ClaimReferenceClass = z.infer<typeof claimReferenceClassSchema>;

export const inconsistencyStatusSchema = z.enum(['open', 'triaged', 'reconciled', 'dismissed']);
export type InconsistencyStatus = z.infer<typeof inconsistencyStatusSchema>;

export const hypothesisClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  level: hypothesisEpistemicLevelSchema,
  referenceIds: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
});
export type HypothesisClaim = z.infer<typeof hypothesisClaimSchema>;

export const hypothesisVersionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string().min(3),
  summary: z.string().min(10),
  rationale: z.string().min(3),
  claims: z.array(hypothesisClaimSchema).min(1),
  previousVersionId: z.string().nullable(),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type HypothesisVersion = z.infer<typeof hypothesisVersionSchema>;

export const paperCardSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(3),
  authors: z.array(z.string().min(1)).min(1),
  year: z.number().int().min(1900),
  sourceUrl: z.string().url(),
  summary: z.string().min(10),
  mechanisms: z.array(z.string().min(2)).min(1),
  limitations: z.array(z.string().min(2)).default([]),
  claimIds: z.array(z.string().min(1)).default([]),
  referenceClass: claimReferenceClassSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PaperCard = z.infer<typeof paperCardSchema>;

export const inconsistencyItemSchema = z.object({
  id: z.string().min(1),
  claimId: z.string().min(1),
  paperId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(10),
  status: inconsistencyStatusSchema,
  severity: z.enum(['low', 'medium', 'high']),
  openedAt: z.string().datetime(),
  openedBy: z.string().min(1),
  resolution: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
});
export type InconsistencyItem = z.infer<typeof inconsistencyItemSchema>;

export const auditInputSchema = z.object({
  responseText: z.string().min(1),
  claimIds: z.array(z.string()).default([]),
});

export const createHypothesisVersionSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  rationale: z.string().min(3),
  claims: z.array(hypothesisClaimSchema).min(1),
});

export const logInconsistencySchema = z.object({
  claimId: z.string().min(1),
  paperId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(10),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type EpistemicAuditResult = {
  claimIds: string[];
  alerts: Array<{
    code: 'inflated_language' | 'analogy_as_mechanism' | 'confirmation_bias' | 'mixed_epistemic_levels';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  score: number;
};

export const statisticalValidationInputSchema = z.object({
  controlSuccesses: z.number().int().nonnegative(),
  controlTotal: z.number().int().positive(),
  treatmentSuccesses: z.number().int().nonnegative(),
  treatmentTotal: z.number().int().positive(),
  confidenceLevel: z.number().min(0.8).max(0.999).default(0.95),
  alternative: z.enum(['two-sided', 'greater', 'less']).default('two-sided'),
});

export type StatisticalValidationResult = {
  controlRate: number;
  treatmentRate: number;
  absoluteDelta: number;
  relativeLift: number | null;
  zScore: number;
  pValue: number;
  confidenceLevel: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  isSignificant: boolean;
};
