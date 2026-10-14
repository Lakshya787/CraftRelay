/**
 * components/ui/ProgressBar.tsx — Horizontal progress bar.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Radius } from "../../constants/spacing";

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  showLabel?: boolean;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  color = Colors.primary,
  showLabel = false,
  height = 8,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%` as `${number}%`, backgroundColor: color, height },
          ]}
        />
      </View>
      {showLabel ? <Text style={styles.label}>{clamped}%</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  track: {
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: Radius.full,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    minWidth: 32,
    textAlign: "right",
  },
});
