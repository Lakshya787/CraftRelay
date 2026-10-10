/**
 * constants/colors.ts — CraftRelay design token colours.
 *
 * Consuming components import from here so colour changes
 * only need to happen in one place.
 */

export const Colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary: "#3B82F6",       // Blue 500
  primaryDark: "#2563EB",   // Blue 600
  primaryLight: "#60A5FA",  // Blue 400
  accent: "#8B5CF6",        // Violet 500

  // ── Background ─────────────────────────────────────────────────────────────
  backgroundDeep: "#0F172A",   // Slate 900
  backgroundCard: "#1E293B",   // Slate 800
  backgroundMuted: "#334155",  // Slate 700

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: "#F8FAFC",   // Slate 50
  textSecondary: "#94A3B8", // Slate 400
  textMuted: "#475569",     // Slate 600

  // ── Status ─────────────────────────────────────────────────────────────────
  success: "#22C55E",  // Green 500
  warning: "#F59E0B",  // Amber 500
  error: "#EF4444",    // Red 500
  info: "#06B6D4",     // Cyan 500

  // ── Roles ──────────────────────────────────────────────────────────────────
  roleWorker: "#3B82F6",    // Blue
  roleAssessor: "#8B5CF6",  // Violet
  roleCustomer: "#22C55E",  // Green
  roleAdmin: "#F59E0B",     // Amber
} as const;

export type ColorKey = keyof typeof Colors;
