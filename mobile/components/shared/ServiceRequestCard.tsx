/**
 * components/shared/ServiceRequestCard.tsx — Service request summary card.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import type { ServiceRequest } from "../../types/domain";
import { StatusIndicator } from "./StatusIndicator";

interface ServiceRequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
  perspective?: "worker" | "customer";
}

export function ServiceRequestCard({
  request,
  onPress,
  perspective = "customer",
}: ServiceRequestCardProps) {
  const dateStr = new Date(request.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <View style={styles.skillChip}>
          <Text style={styles.skillText}>{request.skill.name}</Text>
        </View>
        <StatusIndicator status={request.status} />
      </View>

      <Text style={styles.title}>{request.title}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {request.description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>📍 {request.location}</Text>
        <Text style={styles.meta}>🗓 {dateStr}</Text>
        {request.budget ? (
          <Text style={styles.budget}>₹{request.budget}</Text>
        ) : null}
      </View>

      {perspective === "worker" && request.customer ? (
        <Text style={styles.customer}>
          Customer: {request.customer.name}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.base,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: { opacity: 0.9 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillChip: {
    backgroundColor: "#E8F0FB",
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
  },
  skillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
    alignItems: "center",
  },
  meta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  budget: {
    marginLeft: "auto",
    fontSize: 15,
    fontWeight: "700",
    color: Colors.teal,
  },
  customer: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
});
