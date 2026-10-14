/**
 * components/shared/CriterionCard.tsx — Qualification criterion display card.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import type { QualificationCriterion } from "../../types/domain";
import { ProgressBar } from "../ui/ProgressBar";

interface CriterionCardProps {
  criterion: QualificationCriterion;
  score?: number;
  maxScore?: number;
  showProgress?: boolean;
}

export function CriterionCard({ criterion, score, maxScore, showProgress = false }: CriterionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{criterion.title}</Text>
        <Text style={styles.weight}>{criterion.weightage}%</Text>
      </View>

      <Text style={styles.desc}>{criterion.description}</Text>

      <View style={styles.evidenceList}>
        <Text style={styles.evidenceTitle}>Evidence required:</Text>
        {criterion.evidenceRequired.map((item, i) => (
          <Text key={i} style={styles.evidenceItem}>
            • {item}
          </Text>
        ))}
      </View>

      {showProgress && typeof score === "number" && typeof maxScore === "number" ? (
        <View style={styles.scoreRow}>
          <ProgressBar
            value={(score / maxScore) * 100}
            color={Colors.primary}
            style={{ flex: 1 }}
          />
          <Text style={styles.scoreText}>
            {score}/{maxScore}
          </Text>
        </View>
      ) : null}
    </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  weight: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    backgroundColor: "#E8F0FB",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  evidenceList: {
    gap: 3,
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  evidenceItem: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    minWidth: 40,
    textAlign: "right",
  },
});
