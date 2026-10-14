/**
 * components/shared/EvidenceCard.tsx — Evidence item card for submission and review.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import type { Evidence } from "../../types/domain";
import { StatusIndicator } from "./StatusIndicator";

const TYPE_ICON: Record<Evidence["type"], string> = {
  photo: "📷",
  video: "🎥",
  certificate: "📜",
  document: "📄",
  url: "🔗",
};

interface EvidenceCardProps {
  evidence: Evidence;
  onPress?: () => void;
}

export function EvidenceCard({ evidence, onPress }: EvidenceCardProps) {
  const icon = TYPE_ICON[evidence.type];
  const date = new Date(evidence.submittedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.iconArea}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {evidence.title}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {evidence.description}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.date}>{date}</Text>
          <StatusIndicator status={evidence.status} />
        </View>
        {evidence.reviewNote ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>📝 {evidence.reviewNote}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: { opacity: 0.9 },
  iconArea: {
    width: 56,
    backgroundColor: Colors.backgroundMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  note: {
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginTop: 4,
  },
  noteText: {
    fontSize: 11,
    color: Colors.warning,
    lineHeight: 16,
  },
});
