/**
 * components/ui/EmptyState.tsx — Empty list / section state.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing["3xl"],
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    marginTop: Spacing.sm,
  },
});
