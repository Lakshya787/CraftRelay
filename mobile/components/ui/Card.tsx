/**
 * components/ui/Card.tsx — Reusable card surface component.
 */

import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: PressableProps["onPress"];
  padded?: boolean;
}

export function Card({ children, style, onPress, padded = true }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        testID="craftrelay-card"
        style={({ pressed }) => [
          styles.card,
          padded && styles.padded,
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID="craftrelay-card" style={[styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  padded: {
    padding: Spacing.base,
  },
  pressed: {
    opacity: 0.92,
  },
});
