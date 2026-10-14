/**
 * components/ui/ErrorState.tsx — Error / failure state with retry.
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
    color: Colors.textPrimary,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
