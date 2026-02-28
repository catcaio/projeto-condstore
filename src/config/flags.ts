export const ENABLE_CONCEPT_LAYER = process.env.NEXT_PUBLIC_ENABLE_CONCEPT_LAYER === "true";
export const CONCEPT_VARIANT = (process.env.NEXT_PUBLIC_CONCEPT_VARIANT || "A") as 'A' | 'B' | 'C';
