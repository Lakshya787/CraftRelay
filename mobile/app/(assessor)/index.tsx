/**
 * app/(assessor)/index.tsx — Assessor assessment queue (real API).
 *
 * Lists submitted / under-review cases from GET /assessments/queue.
 * Tapping a case opens the review screen with its case ID.
 */

import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAssessorQueue } from "../../hooks/useAssessorWorkflow";
import type { AssessmentCaseSummary } from "../../hooks/useAssessments";

const FILTERS = ["All", "Submitted", "Under Review"] as const;
type Filter = (typeof FILTERS)[number];

const READINESS_LABEL: Record<string, string> = {
  NO_CRITERIA: "No criteria",
  MANDATORY_GAPS_REMAIN: "Mandatory gaps",
  GAPS_REMAIN: "Gaps remain",
  READY_FOR_ASSESSOR_DECISION: "Ready for decision",
};

export default function AssessorQueueScreen() {
  const { cases, loading, error, refetch } = useAssessorQueue();
  const [filter, setFilter] = useState<Filter>("All");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () =>
      cases.filter((item) => {
        if (filter === "Submitted") return item.status === "submitted";
        if (filter === "Under Review") return item.status === "under_review";
        return true;
      }),
    [cases, filter]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (loading && cases.length === 0) {
    return <LoadingState message="Loading assessment queue…" fullScreen />;
  }

  if (error && cases.length === 0) {
    return <ErrorState title="Queue unavailable" message={error} onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{cases.length}</Text>
          <Text style={styles.statLabel}>In queue</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>
            {cases.filter((c) => c.mandatory_blocker_count > 0).length}
          </Text>
          <Text style={styles.statLabel}>Mandatory gaps</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.teal }]}>
            {cases.filter((c) => c.readiness === "READY_FOR_ASSESSOR_DECISION").length}
          </Text>
          <Text style={styles.statLabel}>Ready</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <Pressable
            key={item}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item }}
          >
            <Text
              style={[
                styles.filterLabel,
                filter === item && styles.filterLabelActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="Queue is clear"
            description="Submitted assessment cases will appear here."
          />
        }
        renderItem={({ item }) => <QueueCard item={item} />}
      />
    </View>
  );
}

function QueueCard({ item }: { item: AssessmentCaseSummary }) {
  const isReady = item.readiness === "READY_FOR_ASSESSOR_DECISION";
  return (
    <Card
      onPress={() =>
        router.push({
          pathname: "/(assessor)/review",
          params: { caseId: item.id },
        })
      }
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Avatar name={item.worker_name ?? "Worker"} size={44} />
        <View style={styles.cardInfo}>
          <Text style={styles.workerName}>{item.worker_name ?? "Worker"}</Text>
          <Text style={styles.qualName} numberOfLines={1}>
            {item.qualification_title}
          </Text>
          <Text style={styles.qualMeta}>
            {item.qualification_code} · v{item.qualification_version_number}
          </Text>
        </View>
        <Badge
          label={item.status === "under_review" ? "In review" : "Submitted"}
          variant={item.status === "under_review" ? "primary" : "warning"}
          size="sm"
        />
      </View>

      <View style={styles.cardFooter}>
        <Badge
          label={READINESS_LABEL[item.readiness] ?? item.readiness}
          variant={isReady ? "success" : "default"}
          size="sm"
        />
        {item.mandatory_blocker_count > 0 ? (
          <Text style={styles.blockerText}>
            {item.mandatory_blocker_count} mandatory gap
            {item.mandatory_blocker_count === 1 ? "" : "s"}
          </Text>
        ) : null}
        <Text style={styles.openLabel}>Open ›</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundCard,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundMuted,
  },
  filterChipActive: { backgroundColor: Colors.roleAssessor },
  filterLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  filterLabelActive: { color: Colors.white },
  list: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  card: { gap: Spacing.md },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardInfo: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  qualName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  qualMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  blockerText: { fontSize: 11, color: Colors.warning, flex: 1 },
  openLabel: { fontSize: 12, fontWeight: "700", color: Colors.roleAssessor },
  errorBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { fontSize: 12, color: Colors.error },
});
