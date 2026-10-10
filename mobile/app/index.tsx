/**
 * app/index.tsx — Landing / splash screen.
 *
 * Part 1: Minimal placeholder that confirms the app boots.
 * Part 3: This will be replaced with the auth flow.
 */

import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function LandingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Logo mark */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoMark}>CR</Text>
      </View>

      {/* App title */}
      <Text style={styles.title}>CraftRelay</Text>
      <Text style={styles.tagline}>
        Verified skills.{"\n"}Trusted connections.
      </Text>

      {/* Status badge — confirms Part 1 foundation */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>⚡ Foundation Ready — Part 1</Text>
      </View>

      {/* Placeholder CTA — will navigate to auth in Part 3 */}
      <Pressable style={styles.ctaButton}>
        <Text style={styles.ctaText}>Get Started</Text>
      </Pressable>

      <Text style={styles.footnote}>
        Smart India Hackathon · SIH 2025
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoMark: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  badge: {
    backgroundColor: "#1E3A5F",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  badgeText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600",
  },
  ctaButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingHorizontal: 48,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footnote: {
    color: "#475569",
    fontSize: 12,
    position: "absolute",
    bottom: 48,
  },
});
