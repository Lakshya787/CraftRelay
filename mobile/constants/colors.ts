/**
 * constants/colors.ts — Design tokens aligned with the CraftRelay design system.
 *
 * Ground / ink / accent palette replaces the old navy+teal brand for consistency.
 * Role accent colors are preserved for tab bars and role-specific UI.
 * Status colors remain functional (success, warning, error, info).
 */

export const Colors = {
  // ── Core surface & text ──────────────────────────────────────────────────
  /** Near-white page ground */
  background: "#fcfcfd",
  /** White card / panel surface */
  backgroundCard: "#ffffff",
  /** Pale grey shared field (section backgrounds, muted areas) */
  backgroundMuted: "#f3f4f6",
  /** Dark field background (dark sections, footers) */
  backgroundDark: "#16191f",

  // ── Ink (text) ────────────────────────────────────────────────────────────
  /** Primary ink — dark display and body text */
  textPrimary: "#16191f",
  /** Secondary ink — supporting / metadata text */
  textSecondary: "#454c58",
  /** Muted / placeholder text */
  textMuted: "#9da5b4",
  /** Text on dark field backgrounds */
  textInverse: "#fcfcfd",
  /** Secondary text on dark field backgrounds */
  textInverseSecondary: "#d0d4dd",
  /** Link / action text */
  textLink: "#074ce0",

  // ── Accent (electric blue) ────────────────────────────────────────────────
  /** Primary action / accent — electric blue */
  primary: "#074ce0",
  primaryDark: "#053cb5",
  primaryLight: "#3a6fec",
  /** Text on accent background */
  onAccent: "#ffffff",

  // ── Rule / border ─────────────────────────────────────────────────────────
  border: "#dde0e6",
  borderFocus: "#074ce0",
  divider: "#dde0e6",

  // ── Role accent colors (preserved for tab bar & role badge) ───────────────
  roleWorker: "#074ce0",
  roleAssessor: "#7C3AED",
  roleCustomer: "#0D9488",
  roleAdmin: "#D97706",

  // ── Status ────────────────────────────────────────────────────────────────
  success: "#16A34A",
  successBg: "#DCFCE7",
  warning: "#D97706",
  warningBg: "#FEF3C7",
  error: "#DC2626",
  errorBg: "#FEE2E2",
  info: "#0284C7",
  infoBg: "#E0F2FE",

  // ── Neutrals ──────────────────────────────────────────────────────────────
  white: "#ffffff",
  black: "#000000",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBarBackground: "#ffffff",
  tabBarActive: "#074ce0",
  tabBarInactive: "#9da5b4",

  // ── Legacy aliases (kept so existing screens compile unchanged) ───────────
  teal: "#0D9488",
  tealLight: "#14B8A6",
  tealDark: "#0F766E",
} as const;
