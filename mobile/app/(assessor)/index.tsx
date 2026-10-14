/**
 * app/(assessor)/index.tsx — Assessor assessment queue.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_ASSESSMENTS } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { StatusIndicator } from "../../components/shared/StatusIndicator";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";

const PRIORITY_FILTERS = ["All", "Pending", "In Progress"] as const;
type PriorityFilter = typeof PRIORITY_FILTERS[number];

export default function AssessorQueueScreen() {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<PriorityFilter>("All");

  const myQueue = MOCK_ASSESSMENTS.filter((a) => a.assessor.id === user?.id);
  const filtered = myQueue.filter((a) => {
    if (filter === "All") return a.status !== "completed" && a.status !== "cancelled";
    if (filter === "Pending") return a.status === "pending";
    if (filter === "In Progress") return a.status === "in_progress";
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{myQueue.filter((a) => a.status === "pending").length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {myQueue.filter((a) => a.status === "in_progress").length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            {myQueue.filter((a) => a.status === "completed").length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        {PRIORITY_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
              {f}
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
            icon="✅"
            title="Queue is clear"
            description="All assessments have been reviewed. Well done!"
          />
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push("/(assessor)/review")}
            style={styles.queueCard}
          >
            <View style={styles.cardHeader}>
              <Avatar name={item.worker.user.name} size={44} />
              <View style={styles.cardInfo}>
                <Text style={styles.workerName}>{item.worker.user.name}</Text>
                <Text style={styles.qualName}>{item.qualification.title}</Text>
                <Text style={styles.qualSkill}>{item.qualification.skill.name}</Text>
              </View>
              <StatusIndicator status={item.status} />
            </View>

            <View style={styles.cardFooter}>
              <Badge
                label={item.type === "evidence_review" ? "Evidence Review" : "Practical Test"}
                variant={item.type === "evidence_review" ? "primary" : "teal"}
                size="sm"
              />
              <Text style={styles.evidenceCount}>
                {item.evidence.length} piece{item.evidence.length !== 1 ? "s" : ""} of evidence
              </Text>
              {item.assessorNotes ? (
                <Text style={styles.notePreview} numberOfLines={1}>
                  📝 {item.assessorNotes}
                </Text>
              ) : null}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  statItem: { alignItems: "center", gap: 3 },
  statValue: { fontSize: 24, fontWeight: "800", color: Colors.warning },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.roleAssessor,
    borderColor: Colors.roleAssessor,
  },
  filterLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  filterLabelActive: { color: Colors.white },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing["4xl"] },
  queueCard: { gap: Spacing.md },
  cardHeader: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  cardInfo: { flex: 1, gap: 2 },
  workerName: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  qualName: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  qualSkill: { fontSize: 12, color: Colors.textMuted },
  cardFooter: { gap: Spacing.xs },
  evidenceCount: { fontSize: 12, color: Colors.textMuted },
  notePreview: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
});
