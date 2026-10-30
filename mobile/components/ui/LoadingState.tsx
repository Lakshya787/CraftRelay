/**
 * components/ui/LoadingState.tsx — Loading spinner with optional message.
 *
 * Spinner uses the accent color; message uses ink-secondary.
 * Background on full-screen mode matches the ground token.
 */

import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading…", fullScreen = false }: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing["2xl"],
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background,   // --dp-color-ground: #fcfcfd
  },
  message: {
    fontSize: 14,                          // --dp-typography-small
    color: Colors.textSecondary,           // --dp-color-ink-secondary
  },
});
