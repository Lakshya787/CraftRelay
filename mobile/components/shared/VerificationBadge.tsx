/**
 * components/shared/VerificationBadge.tsx — Worker skill verification status.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import type { VerificationStatus } from "../../types/domain";

interface VerificationBadgeProps {
  status: VerificationStatus;
  style?: ViewStyle;
}

const CONFIG: Record<VerificationStatus, { label: string; icon: string; color: string; bg: string }> = {
  verified: { label: "Verified", icon: "✓", color: Colors.success, bg: Colors.successBg },
  pending: { label: "Under Review", icon: "⏳", color: Colors.warning, bg: Colors.warningBg },
  unverified: { label: "Unverified", icon: "○", color: Colors.textMuted, bg: Colors.backgroundMuted },
  suspended: { label: "Suspended", icon: "✕", color: Colors.error, bg: Colors.errorBg },
};

export function VerificationBadge({ status, style }: VerificationBadgeProps) {
  const { label, icon, color, bg } = CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  icon: {
    fontSize: 11,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
