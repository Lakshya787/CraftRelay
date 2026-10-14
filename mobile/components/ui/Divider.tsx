/**
 * components/ui/Divider.tsx — Horizontal rule divider.
 */

import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";

interface DividerProps {
  style?: ViewStyle;
  spacing?: number;
}

export function Divider({ style, spacing = Spacing.base }: DividerProps) {
  return (
    <View
      style={[styles.divider, { marginVertical: spacing }, style]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
