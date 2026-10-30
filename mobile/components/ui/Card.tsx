/**
 * components/ui/Card.tsx — Reusable card surface component.
 *
 * Visual style (design system):
 *   - White panel surface (--dp-color-panel: #ffffff)
 *   - 12 px corner radius (--dp-radius-panel)
 *   - 1 px hairline border in rule color (--dp-color-rule: #dde0e6)
 *   - Soft downward shadow (elevation 2 on Android)
 *   - Press state: slight opacity drop (reduced-motion safe, no translate)
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
    backgroundColor: Colors.backgroundCard,  // --dp-color-panel: #ffffff
    borderRadius: Radius.lg,                 // --dp-radius-panel: 12px
    borderWidth: 1,                          // --dp-border-hairline: 1px
    borderColor: Colors.divider,             // --dp-color-rule: #dde0e6
    // Soft downward shadow
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  padded: {
    padding: Spacing.base,
  },
  pressed: {
    opacity: 0.90,
  },
});
