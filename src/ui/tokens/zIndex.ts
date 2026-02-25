export const zIndex = {
  base: 0,
  content: 10,
  sticky: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

export type ZIndexToken = keyof typeof zIndex;
