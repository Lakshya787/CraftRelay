/**
 * constants/colors.ts — CraftRelay design token colours.
 *
 * Updated for Part 2: Navy and teal professional identity.
 * Consuming components import from here so colour changes
 * only need to happen in one place.
 */

export const Colors = {
  // ── Brand — Navy + Teal ────────────────────────────────────────────────────
  primary: "#0F4C81",       // Navy 700 — primary action
  primaryDark: "#0A3561",   // Navy 800 — pressed state
  primaryLight: "#1A6DB5",  // Navy 600 — hover / highlight
  teal: "#0D9488",          // Teal 600 — accent / verified
  tealLight: "#14B8A6",     // Teal 500 — lighter teal
  tealDark: "#0F766E",      // Teal 700 — dark teal

  // ── Background ─────────────────────────────────────────────────────────────
  background: "#F7F9FC",      // Near-white page background
  backgroundCard: "#FFFFFF",  // Card surfaces
  backgroundMuted: "#EEF2F7", // Muted sections, chips
  backgroundDark: "#0C2D4E",  // Dark header or splash areas

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: "#0F172A",    // Near-black — primary text
  textSecondary: "#4B5563",  // Gray 600 — secondary text
  textMuted: "#9CA3AF",      // Gray 400 — placeholder / disabled
  textInverse: "#FFFFFF",    // White — on dark surfaces
  textLink: "#0F4C81",       // Navy — links

  // ── Border & Dividers ──────────────────────────────────────────────────────
  border: "#D1D9E6",      // Subtle borders
  borderFocus: "#0F4C81", // Focus ring colour
  divider: "#E5EAF2",     // Divider lines

  // ── Status ─────────────────────────────────────────────────────────────────
  success: "#16A34A",      // Green 600
  successBg: "#DCFCE7",    // Green 100
  warning: "#D97706",      // Amber 600
  warningBg: "#FEF3C7",    // Amber 100
  error: "#DC2626",        // Red 600
  errorBg: "#FEE2E2",      // Red 100
  info: "#0284C7",         // Sky 600
  infoBg: "#E0F2FE",       // Sky 100

  // ── Roles ──────────────────────────────────────────────────────────────────
  roleWorker: "#0F4C81",    // Navy
  roleAssessor: "#7C3AED",  // Violet
  roleCustomer: "#0D9488",  // Teal
  roleAdmin: "#D97706",     // Amber

  // ── Neutral ────────────────────────────────────────────────────────────────
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBarBackground: "#FFFFFF",
  tabBarActive: "#0F4C81",
  tabBarInactive: "#9CA3AF",
} as const;

export type ColorKey = keyof typeof Colors;
