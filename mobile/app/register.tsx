/**
 * app/register.tsx — Registration screen.
 *
 * Part 2: UI-only with form validation. No backend call.
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
import type { UserRole } from "../types/domain";

const ROLE_OPTIONS: { role: UserRole; label: string; icon: string }[] = [
  { role: "worker", label: "Worker", icon: "🔧" },
  { role: "customer", label: "Customer", icon: "🏠" },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "worker",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(field: keyof FormState) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!form.email.includes("@")) e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid 10-digit phone number";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1000);
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Account created!</Text>
        <Text style={styles.successMessage}>
          Your account is pending verification. You will receive a confirmation once reviewed.
        </Text>
        <Button label="Go to Sign In" variant="primary" size="lg" onPress={() => router.replace("/login")} />
      </View>
    );
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join CraftRelay and get started today</Text>

        {/* Role selection */}
        <View style={styles.roleSection}>
          <Text style={styles.sectionLabel}>I am a</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map(({ role, label, icon }) => (
              <Pressable
                key={role}
                style={[styles.roleBtn, form.role === role && styles.roleBtnActive]}
                onPress={() => setForm((f) => ({ ...f, role }))}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.role === role }}
              >
                <Text style={styles.roleIcon}>{icon}</Text>
                <Text style={[styles.roleLabel, form.role === role && styles.roleLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Form fields */}
        <View style={styles.form}>
          <TextInput
            label="Full Name"
            value={form.name}
            onChangeText={update("name")}
            error={errors.name}
            placeholder="e.g. Rajan Mehta"
            autoCapitalize="words"
            autoComplete="name"
            required
          />
          <TextInput
            label="Email"
            value={form.email}
            onChangeText={update("email")}
            error={errors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            required
          />
          <TextInput
            label="Phone Number"
            value={form.phone}
            onChangeText={update("phone")}
            error={errors.phone}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            required
          />
          <TextInput
            label="Password"
            value={form.password}
            onChangeText={update("password")}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            hint="Minimum 8 characters"
            required
          />
          <TextInput
            label="Confirm Password"
            value={form.confirmPassword}
            onChangeText={update("confirmPassword")}
            error={errors.confirmPassword}
            secureTextEntry
            autoComplete="new-password"
            required
          />
        </View>

        <Text style={styles.terms}>
          By registering, you agree to CraftRelay&apos;s{" "}
          <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>

        <Button
          label="Create Account"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleRegister}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Pressable onPress={() => router.push("/login")} accessibilityRole="link">
            <Text style={styles.loginLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },    // --dp-color-ground
  container: {
    padding: Spacing["2xl"],
    gap: Spacing.xl,
    paddingBottom: Spacing["4xl"],
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,            // --dp-color-ink: #16191f
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,                         // --dp-typography-small
    color: Colors.textSecondary,          // --dp-color-ink-secondary
    marginTop: -Spacing.md,
  },
  roleSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  roleRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  roleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,              // --dp-radius-panel: 12px
    borderWidth: 1,                       // --dp-border-hairline
    borderColor: Colors.border,           // --dp-color-rule
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
  },
  roleBtnActive: {
    borderColor: Colors.primary,          // --dp-color-accent: #074ce0
    backgroundColor: "#e8eef9",          // subtle blue tint of accent
  },
  roleIcon: {
    fontSize: 28,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  roleLabelActive: {
    color: Colors.primary,
  },
  form: {
    gap: Spacing.base,
  },
  terms: {
    fontSize: 12,                         // --dp-typography-label
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.base,
  },
  successIcon: { fontSize: 56 },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  successMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,                       // 14 × 1.6 body-leading
    marginBottom: Spacing.sm,
  },
});
