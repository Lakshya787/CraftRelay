/**
 * components/ui/SectionHeader.tsx — Section title with optional trailing element.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";

interface SectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionHeader({ title, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
