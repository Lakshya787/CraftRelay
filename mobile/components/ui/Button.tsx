/**
 * components/ui/Button.tsx — Reusable button component.
 *
 * Visual style:
 *   primary  — electric-blue fill, white label
 *   secondary — pale ground-muted fill, ink label (outlined feel without border)
 *   outline  — transparent with accent border and accent label
 *   ghost    — transparent, accent label
 *   danger   — error-red fill, white label
 *
 * Hover / press: slight opacity drop on press; disabled opacity 0.45.
 * Focus: native accessibility focus ring is preserved.
 * Motion: 160 ms ease-out (via Pressable's built-in feedback; no JS animation
 *         added to respect reduced-motion on device).
 */

import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID="craftrelay-button"
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? Colors.white : Colors.primary}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`], textStyle]}>
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    // --dp-radius-panel (12 px) keeps buttons friendly-cornered but not pill-shaped
    borderRadius: Radius.lg,
    borderWidth: 0,
  },
  fullWidth: { width: "100%" },
  /** Press returns to resting — slight opacity, no translate (reduced-motion safe) */
  pressed: { opacity: 0.80 },
  disabled: { opacity: 0.45 },

  // ── Variant fills ────────────────────────────────────────────────────────
  /** Blue primary — accent fill */
  primary: {
    backgroundColor: Colors.primary,
  },
  /** Pale secondary — ground-muted fill */
  secondary: {
    backgroundColor: Colors.backgroundMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  /** Outlined — transparent with accent border */
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: Colors.error,
  },

  // ── Sizes ────────────────────────────────────────────────────────────────
  size_sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, minHeight: 36 },
  size_md: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 4, minHeight: 48 },
  size_lg: { paddingHorizontal: Spacing["2xl"], paddingVertical: Spacing.md + 2, minHeight: 56 },

  // ── Label base ───────────────────────────────────────────────────────────
  label: { fontWeight: "600", letterSpacing: 0.2 },
  label_primary: { color: Colors.white },
  label_secondary: { color: Colors.textPrimary },
  label_outline: { color: Colors.primary },
  label_ghost: { color: Colors.primary },
  label_danger: { color: Colors.white },

  // ── Label sizes (Instrument Sans — interface / small scale) ──────────────
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 16 },
});
