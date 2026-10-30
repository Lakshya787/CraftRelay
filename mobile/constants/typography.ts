/**
 * constants/typography.ts — Typography tokens.
 *
 * Display / headings / quotations → Host Grotesk (bold, tight tracking)
 * Body / labels / controls        → Instrument Sans
 *
 * To activate custom fonts in Expo:
 *   pnpm add @expo-google-fonts/host-grotesk @expo-google-fonts/instrument-sans expo-font
 *   Then load them in app/_layout.tsx with useFonts() and reference these
 *   fontFamily strings on Text / StyleSheet nodes.
 *
 * Until fonts are loaded the system sans-serif renders as the fallback,
 * which is visually acceptable while preserving the token contract.
 */

export const Typography = {
  fontFamily: {
    /** Display, headings, large numerals — Host Grotesk */
    display: "HostGrotesk-Bold",
    displayMedium: "HostGrotesk-SemiBold",
    /** Body copy, labels, controls — Instrument Sans */
    regular: "InstrumentSans-Regular",
    medium: "InstrumentSans-Medium",
    semiBold: "InstrumentSans-SemiBold",
    bold: "InstrumentSans-Bold",
  },

  fontSize: {
    /** --dp-typography-label: 12px */
    label: 12,
    /** --dp-typography-metadata: 13px */
    metadata: 13,
    /** --dp-typography-small: 14px */
    small: 14,
    /** --dp-typography-interface: 15px */
    interface: 15,
    /** --dp-typography-body: 16px */
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,

    // Legacy numeric aliases (preserve existing call-sites)
    xs: 11,
    sm: 13,
    md: 16,
  },

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semiBold: "600" as const,
    bold: "700" as const,
    extraBold: "800" as const,
  },

  lineHeight: {
    /** Display / headings — tight */
    tight: 1.2,
    /** Default reading */
    normal: 1.5,
    /** Body copy — --dp-typography-body-leading: 1.6 */
    relaxed: 1.6,
  },

  /** Letter-spacing for display / heading text */
  letterSpacing: {
    display: -0.6,
    heading: -0.3,
    normal: 0,
    wide: 0.4,
  },
} as const;
