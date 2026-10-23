/**
 * constants/colors.ts — CraftRelay design token colours.
 *
 * Updated for Part 2: Navy and teal professional identity.
 * Consuming components import from here so colour changes
 * only need to happen in one place.
 */

import { Platform } from "react-native";

const webPalette = Platform.OS === "web";

export const Colors = {
  // ── Brand — Navy + Teal ────────────────────────────────────────────────────
  primary: webPalette ? "#ff4d4d" : "#0F4C81",
  primaryDark: webPalette ? "#df3838" : "#0A3561",
  primaryLight: webPalette ? "#ff7777" : "#1A6DB5",
  teal: webPalette ? "#2d5da1" : "#0D9488",
  tealLight: webPalette ? "#527bb2" : "#14B8A6",
  tealDark: webPalette ? "#204a84" : "#0F766E",

  // ── Background ─────────────────────────────────────────────────────────────
  background: webPalette ? "#fdfbf7" : "#F7F9FC",
  backgroundCard: "#FFFFFF",
  backgroundMuted: webPalette ? "#e5e0d8" : "#EEF2F7",
  backgroundDark: webPalette ? "#2d2d2d" : "#0C2D4E",

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: webPalette ? "#2d2d2d" : "#0F172A",
  textSecondary: webPalette ? "#55504a" : "#4B5563",
  textMuted: "#9CA3AF",      // Gray 400 — placeholder / disabled
  textInverse: "#FFFFFF",    // White — on dark surfaces
  textLink: webPalette ? "#2d5da1" : "#0F4C81",

  // ── Border & Dividers ──────────────────────────────────────────────────────
  border: webPalette ? "#2d2d2d" : "#D1D9E6",
  borderFocus: webPalette ? "#2d5da1" : "#0F4C81",
  divider: webPalette ? "#e5e0d8" : "#E5EAF2",

  // ── Status ─────────────────────────────────────────────────────────────────
  success: webPalette ? "#2d5da1" : "#16A34A",
  successBg: "#DCFCE7",    // Green 100
  warning: webPalette ? "#b98200" : "#D97706",
  warningBg: "#FEF3C7",    // Amber 100
  error: webPalette ? "#ff4d4d" : "#DC2626",
  errorBg: "#FEE2E2",      // Red 100
  info: "#0284C7",         // Sky 600
  infoBg: "#E0F2FE",       // Sky 100

  // ── Roles ──────────────────────────────────────────────────────────────────
  roleWorker: webPalette ? "#2d5da1" : "#0F4C81",
  roleAssessor: webPalette ? "#ff4d4d" : "#7C3AED",
  roleCustomer: webPalette ? "#2d5da1" : "#0D9488",
  roleAdmin: webPalette ? "#b98200" : "#D97706",

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
  tabBarBackground: webPalette ? "#fffdf8" : "#FFFFFF",
  tabBarActive: webPalette ? "#ff4d4d" : "#0F4C81",
  tabBarInactive: "#9CA3AF",
} as const;

export type ColorKey = keyof typeof Colors;
