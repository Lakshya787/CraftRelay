/**
 * app/login.tsx — Login screen.
 *
 * Authenticates against the saved backend account and routes by assigned role.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../constants/colors";
import { Spacing, Radius } from "../constants/spacing";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/domain";

const ROLE_ROUTES: Record<UserRole, string> = {
  worker: "/(worker)",
  assessor: "/(assessor)",
  customer: "/(customer)",
  admin: "/(admin)",
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Enter a valid email address";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    setAuthError(null);
    try {
      const signedInUser = await login(email.trim(), password);
      router.replace(ROLE_ROUTES[signedInUser.role] as never);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Sign in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>CR</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your CraftRelay account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            required
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete="password"
            required
          />
        </View>

        {authError ? (
          <View style={styles.authError}>
            <Text style={styles.authErrorText}>{authError}</Text>
          </View>
        ) : null}

        <Button
          label="Sign In"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleLogin}
          style={styles.submitBtn}
        />

        <View style={styles.registerRow}>
        <Text style={styles.registerText}>Don&apos;t have an account? </Text>
          <Pressable onPress={() => router.push("/register")} accessibilityRole="link">
            <Text style={styles.registerLink}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: {
    padding: Spacing["2xl"],
    gap: Spacing.xl,
    paddingBottom: Spacing["4xl"],
  },
  header: {
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  logoText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  demoNote: {
    backgroundColor: Colors.infoBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  demoNoteText: {
    fontSize: 13,
    color: Colors.info,
    lineHeight: 19,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  roleGrid: {
    gap: Spacing.sm,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleInfo: {
    flex: 1,
    gap: 2,
  },
  roleName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  roleDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.base,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },
  authError: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  authErrorText: {
    fontSize: 13,
    color: Colors.error,
    lineHeight: 19,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
});
