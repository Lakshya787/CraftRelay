/**
 * app/(assessor)/history.tsx — Completed assessment history (real API).
 *
 * Shows cases in approved or rejected states from GET /assessments/cases.
 */

import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAssessmentHistory } from "../../hooks/useAssessorWorkflow";

export default function AssessorHistoryScreen() {
  const { cases, loading, error, refetch } = useAssessmentHistory();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (loading && cases.length === 0) {
    return <LoadingState message="Loading assessment history…" fullScreen />;
  }

  if (error && cases.length === 0) {
    return <ErrorState title="History unavailable" message={error} onRetry={refetch} />;
  }

  return (
    <FlatList
      style={styles.list}
      data={cases}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListEmptyComponent={
        <EmptyState
          icon="📅"
          title="No history yet"
          description="Approved and rejected assessments will appear here."
        />
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.row}>
            <Avatar
              name={item.worker_name ?? "Worker"}
              size={42}
              backgroundColor={Colors.roleAssessor}
            />
            <View style={styles.info}>
              <Text style={styles.workerName}>
                {item.worker_name ?? "Worker"}
              </Text>
              <Text style={styles.qualName} numberOfLines={1}>
                {item.qualification_title}
              </Text>
              <Text style={styles.meta}>
                {item.qualification_code} · v{item.qualification_version_number} ·{" "}
                {new Date(item.updated_at ?? item.created_at).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" }
                )}
              </Text>
            </View>
            <Badge
              label={item.status === "approved" ? "Verified" : "Rejected"}
              variant={item.status === "approved" ? "success" : "error"}
            />
          </View>
          <Text style={styles.summary}>
            {item.mandatory_blocker_count > 0
              ? `${item.mandatory_blocker_count} mandatory criterion gaps at final review`
              : "All mandatory criteria were reviewed"}
          </Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing["4xl"] },
  card: { gap: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  info: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  qualName: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  meta: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  summary: {
    fontSize: 11,
    color: Colors.textSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
});
