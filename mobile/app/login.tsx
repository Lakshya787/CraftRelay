/**
 * app/login.tsx — Login screen.
 *
 * Part 2: Uses mock auth with role selector for navigation demo.
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

const ROLE_OPTIONS: { role: UserRole; label: string; description: string; color: string }[] = [
  { role: "worker", label: "Worker", description: "Manage your skills and service jobs", color: Colors.roleWorker },
  { role: "assessor", label: "Assessor", description: "Review and verify worker qualifications", color: Colors.roleAssessor },
  { role: "customer", label: "Customer", description: "Discover and hire verified workers", color: Colors.roleCustomer },
  { role: "admin", label: "Admin", description: "Manage the platform and users", color: Colors.roleAdmin },
];

const ROLE_ROUTES: Record<UserRole, string> = {
  worker: "/(worker)",
  assessor: "/(assessor)",
  customer: "/(customer)",
  admin: "/(admin)",
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("rajan.mehta@example.com");
  const [password, setPassword] = useState("••••••••");
  const [selectedRole, setSelectedRole] = useState<UserRole>("worker");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Enter a valid email address";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      login(selectedRole);
      setLoading(false);
      router.replace(ROLE_ROUTES[selectedRole] as never);
    }, 800);
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

        {/* Demo role note */}
        <View style={styles.demoNote}>
          <Text style={styles.demoNoteText}>
            🎭 <Text style={{ fontWeight: "700" }}>Demo mode:</Text> Select your role below to explore the app as that user type.
          </Text>
        </View>

        {/* Role selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Sign in as</Text>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map(({ role, label, description, color }) => (
              <Pressable
                key={role}
                style={[
                  styles.roleCard,
                  selectedRole === role && {
                    borderColor: color,
                    backgroundColor: color + "12",
                  },
                ]}
                onPress={() => setSelectedRole(role)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedRole === role }}
              >
                <View style={[styles.radioCircle, selectedRole === role && { borderColor: color }]}>
                  {selectedRole === role ? (
                    <View style={[styles.radioFill, { backgroundColor: color }]} />
                  ) : null}
                </View>
                <View style={styles.roleInfo}>
                  <Text style={[styles.roleName, selectedRole === role && { color }]}>{label}</Text>
                  <Text style={styles.roleDesc}>{description}</Text>
                </View>
              </Pressable>
            ))}
          </View>
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

        <Pressable style={styles.forgotLink} accessibilityRole="link">
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

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
          <Text style={styles.registerText}>Don't have an account? </Text>
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
