/**
 * app/(admin)/assessments.tsx — Admin view of all assessments.
 *
 * Shows every assessment across all assessors with status filtering.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_ASSESSMENTS } from "../../data/mockData";
import type { AssessmentStatus } from "../../types/domain";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { StatusIndicator } from "../../components/shared/StatusIndicator";
import { EmptyState } from "../../components/ui/EmptyState";
import { ProgressBar } from "../../components/ui/ProgressBar";

type Filter = "all" | AssessmentStatus;

const FILTERS: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AdminAssessmentsScreen() {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = MOCK_ASSESSMENTS.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  const totalScore = (assessment: typeof MOCK_ASSESSMENTS[0]) => {
    if (!assessment.overallScore) return null;
    return assessment.overallScore;
  };

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {MOCK_ASSESSMENTS.filter((a) => a.status === "pending").length}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>
            {MOCK_ASSESSMENTS.filter((a) => a.status === "in_progress").length}
          </Text>
          <Text style={styles.summaryLabel}>In Progress</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {MOCK_ASSESSMENTS.filter((a) => a.status === "completed").length}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.textMuted }]}>
            {MOCK_ASSESSMENTS.filter((a) => a.status === "cancelled").length}
          </Text>
          <Text style={styles.summaryLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ label, value }) => (
          <Pressable
            key={value}
            style={[styles.chip, filter === value && styles.chipActive]}
            onPress={() => setFilter(value)}
          >
            <Text
              style={[
                styles.chipLabel,
                filter === value && styles.chipLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No assessments found"
            description="Try changing the status filter."
            actionLabel="Show all"
            onAction={() => setFilter("all")}
          />
        }
        renderItem={({ item }) => {
          const score = totalScore(item);
          return (
            <Card style={styles.card}>
              {/* Worker + assessor */}
              <View style={styles.participantsRow}>
                <View style={styles.participant}>
                  <Avatar name={item.worker.user.name} size={40} />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantRole}>Worker</Text>
                    <Text style={styles.participantName}>
                      {item.worker.user.name}
                    </Text>
                    <Text style={styles.participantCity}>
                      {item.worker.city}
                    </Text>
                  </View>
                </View>

                <Text style={styles.arrow}>→</Text>

                <View style={styles.participant}>
                  <Avatar
                    name={item.assessor.name}
                    size={40}
                    backgroundColor={Colors.roleAssessor}
                  />
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantRole, { color: Colors.roleAssessor }]}>
                      Assessor
                    </Text>
                    <Text style={styles.participantName}>
                      {item.assessor.name}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Qualification */}
              <View style={styles.qualRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qualTitle}>
                    {item.qualification.title}
                  </Text>
                  <Text style={styles.qualMeta}>
                    {item.qualification.skill.name} · {item.type.replace("_", " ")}
                  </Text>
                </View>
                <StatusIndicator status={item.status} />
              </View>

              {/* Score bar */}
              {score !== null ? (
                <View style={styles.scoreSection}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.scoreLabel}>Score</Text>
                    <Text style={styles.scoreValue}>{score}/100</Text>
                  </View>
                  <ProgressBar
                    value={score}
                    color={score >= 70 ? Colors.success : Colors.warning}
                  />
                </View>
              ) : null}

              {/* Footer */}
              <View style={styles.footer}>
                <Badge
                  label={item.outcome === "pass" ? "Passed" : item.outcome === "fail" ? "Failed" : "Pending outcome"}
                  variant={
                    item.outcome === "pass"
                      ? "success"
                      : item.outcome === "fail"
                      ? "error"
                      : "default"
                  }
                  size="sm"
                />
                {item.scheduledAt ? (
                  <Text style={styles.dateText}>
                    {item.completedAt ? "Completed" : "Scheduled"}{" "}
                    {new Date(
                      item.completedAt ?? item.scheduledAt
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                ) : (
                  <Text style={styles.dateText}>Not yet scheduled</Text>
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: Spacing.md,
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 22, fontWeight: "800", color: Colors.warning },
  summaryLabel: { fontSize: 10, color: Colors.textMuted },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.roleAdmin,
    borderColor: Colors.roleAdmin,
  },
  chipLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  chipLabelActive: { color: Colors.white },
  list: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  card: { gap: Spacing.md },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  participant: { flex: 1, flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  participantInfo: { flex: 1, gap: 2 },
  participantRole: { fontSize: 10, fontWeight: "700", color: Colors.primary, letterSpacing: 0.5 },
  participantName: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  participantCity: { fontSize: 11, color: Colors.textMuted },
  arrow: { fontSize: 18, color: Colors.textMuted },
  qualRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  qualTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  qualMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scoreSection: { gap: 4 },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreLabel: { fontSize: 12, color: Colors.textSecondary },
  scoreValue: { fontSize: 12, fontWeight: "700", color: Colors.textPrimary },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { fontSize: 11, color: Colors.textMuted },
});
