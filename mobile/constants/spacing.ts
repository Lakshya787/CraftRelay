/**
 * constants/spacing.ts — Spacing and radius tokens.
 *
 * Grid gap is 24 (xl). Panel radius is 12 (lg), matching --dp-radius-panel.
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,   // --dp-spacing-grid-gap
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  /** Panel / card radius — matches --dp-radius-panel (12px) */
  lg: 12,
  xl: 18,
  full: 999,
} as const;
