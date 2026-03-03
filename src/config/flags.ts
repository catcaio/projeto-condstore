export const ENABLE_CONCEPT_LAYER = process.env.NEXT_PUBLIC_ENABLE_CONCEPT_LAYER === "true";
export const CONCEPT_VARIANT = (process.env.NEXT_PUBLIC_CONCEPT_VARIANT || "A") as 'A' | 'B' | 'C';
export const CONCIERGE_V1 = (process.env.NEXT_PUBLIC_CONCIERGE_V1 || "false") === "true";
