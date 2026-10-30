/**
 * components/ui/ErrorState.tsx — Error / failure state with retry.
 *
 * Title uses ink (primary text); message uses ink-secondary.
 * Retry button uses the outline variant (accent border, no fill).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="Try Again" onPress={onRetry} variant="outline" /> : null}
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
    fontSize: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,       // --dp-color-ink
    textAlign: "center",
  },
  message: {
    fontSize: 14,                    // --dp-typography-small
    color: Colors.textSecondary,     // --dp-color-ink-secondary
    textAlign: "center",
    lineHeight: 22,                  // 14 × 1.6 body-leading
  },
});
