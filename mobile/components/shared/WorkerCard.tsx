/**
 * components/shared/WorkerCard.tsx — Summary card for a worker in search results.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import type { WorkerProfile } from "../../types/domain";
import { Avatar } from "../ui/Avatar";
import { VerificationBadge } from "./VerificationBadge";
import { Badge } from "../ui/Badge";

interface WorkerCardProps {
  worker: WorkerProfile;
  onPress?: () => void;
}

export function WorkerCard({ worker, onPress }: WorkerCardProps) {
  const verifiedSkills = worker.skills.filter((s) => s.verificationStatus === "verified");
  const primarySkill = worker.skills[0];

  const availabilityColor =
    worker.availabilityStatus === "available"
      ? Colors.success
      : worker.availabilityStatus === "busy"
      ? Colors.warning
      : Colors.textMuted;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${worker.user.name}`}
    >
      <View style={styles.header}>
        <Avatar name={worker.user.name} size={52} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{worker.user.name}</Text>
          <Text style={styles.location}>
            📍 {worker.city}, {worker.state}
          </Text>
          <View style={styles.availRow}>
            <View style={[styles.availDot, { backgroundColor: availabilityColor }]} />
            <Text style={[styles.availLabel, { color: availabilityColor }]}>
              {worker.availabilityStatus === "available"
                ? "Available"
                : worker.availabilityStatus === "busy"
                ? "Busy"
                : "Unavailable"}
            </Text>
          </View>
        </View>
        <View style={styles.ratingBlock}>
          <Text style={styles.ratingValue}>★ {worker.rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>{worker.reviewCount} reviews</Text>
        </View>
      </View>

      {primarySkill ? (
        <View style={styles.skillRow}>
          <Text style={styles.skillLabel}>{primarySkill.skill.name}</Text>
          <VerificationBadge status={primarySkill.verificationStatus} />
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.statRow}>
          <Text style={styles.stat}>
            <Text style={styles.statValue}>{worker.completedJobs}</Text> jobs
          </Text>
          <Text style={styles.stat}>
            <Text style={styles.statValue}>{verifiedSkills.length}</Text> verified skills
          </Text>
          {worker.hourlyRate ? (
            <Text style={styles.rate}>₹{worker.hourlyRate}/hr</Text>
          ) : null}
        </View>
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
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: { opacity: 0.9 },
  header: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  location: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  availLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  ratingBlock: {
    alignItems: "flex-end",
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.warning,
  },
  ratingCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  footer: {},
  statRow: {
    flexDirection: "row",
    gap: Spacing.base,
    alignItems: "center",
  },
  stat: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rate: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: "700",
    color: Colors.teal,
  },
});
