/**
 * components/ui/TextInput.tsx — Reusable text input component.
 */

import React, { useState } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function TextInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  required,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <RNTextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, rightIcon ? styles.inputWithRight : null]}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          {...props}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  required: {
    color: Colors.error,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 50,
  },
  inputFocused: {
    borderColor: Colors.borderFocus,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: Colors.error,
  },
  iconLeft: {
    paddingLeft: Spacing.md,
  },
  iconRight: {
    paddingRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  inputWithLeft: {
    paddingLeft: Spacing.sm,
  },
  inputWithRight: {
    paddingRight: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "500",
  },
  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
