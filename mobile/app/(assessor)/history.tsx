/**
 * app/(assessor)/history.tsx — Assessor completed assessment history.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";
import { MOCK_ASSESSMENTS } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";

export default function AssessorHistoryScreen() {
  const { user } = useAuth();
  const completed = MOCK_ASSESSMENTS.filter(
    (a) => a.status === "completed"
  );

  return (
    <FlatList
      style={styles.list}
      data={completed}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListEmptyComponent={
        <EmptyState
          icon="📅"
          title="No history yet"
          description="Completed assessments will appear here."
        />
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.row}>
            <Avatar name={item.worker.user.name} size={42} backgroundColor={Colors.teal} />
            <View style={styles.info}>
              <Text style={styles.workerName}>{item.worker.user.name}</Text>
              <Text style={styles.qualName}>{item.qualification.title}</Text>
              <Text style={styles.date}>
                Completed{" "}
                {new Date(item.completedAt!).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.outcomeCol}>
              <Badge
                label={item.outcome === "pass" ? "Passed" : "Failed"}
                variant={item.outcome === "pass" ? "success" : "error"}
              />
              {item.overallScore !== undefined ? (
                <Text style={styles.score}>{item.overallScore}/100</Text>
              ) : null}
            </View>
          </View>
          {item.assessorNotes ? (
            <Text style={styles.note} numberOfLines={2}>
              📝 {item.assessorNotes}
            </Text>
          ) : null}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing["4xl"] },
  card: { gap: Spacing.sm },
  row: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  info: { flex: 1, gap: 2 },
  workerName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  qualName: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary },
  date: { fontSize: 11, color: Colors.textMuted },
  outcomeCol: { alignItems: "flex-end", gap: Spacing.xs },
  score: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  note: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
});
