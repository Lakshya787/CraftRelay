/**
 * components/ui/Badge.tsx — Reusable badge / pill component.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "primary"
  | "teal"
  | "violet";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Badge({ label, variant = "default", size = "md", style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], size === "sm" && styles.sm, style]}>
      <Text style={[styles.label, styles[`label_${variant}`], size === "sm" && styles.labelSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: 11,
  },

  // Variant backgrounds
  default: { backgroundColor: Colors.backgroundMuted },
  success: { backgroundColor: Colors.successBg },
  warning: { backgroundColor: Colors.warningBg },
  error: { backgroundColor: Colors.errorBg },
  info: { backgroundColor: Colors.infoBg },
  primary: { backgroundColor: "#E8F0FB" },
  teal: { backgroundColor: "#CCFBF1" },
  violet: { backgroundColor: "#EDE9FE" },

  // Variant text colours
  label_default: { color: Colors.textSecondary },
  label_success: { color: Colors.success },
  label_warning: { color: Colors.warning },
  label_error: { color: Colors.error },
  label_info: { color: Colors.info },
  label_primary: { color: Colors.primary },
  label_teal: { color: Colors.tealDark },
  label_violet: { color: "#7C3AED" },
});
