/**
 * app/(worker)/jobs.tsx — Worker service request queue.
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
import { MOCK_SERVICE_REQUESTS } from "../../data/mockData";
import { ServiceRequestCard } from "../../components/shared/ServiceRequestCard";
import { EmptyState } from "../../components/ui/EmptyState";

const FILTERS = ["Active", "Completed"] as const;
type Filter = typeof FILTERS[number];

export default function WorkerJobsScreen() {
  const [filter, setFilter] = useState<Filter>("Active");

  const myJobs = MOCK_SERVICE_REQUESTS.filter((sr) => sr.worker?.user.id === "u1");
  const filtered = myJobs.filter((sr) =>
    filter === "Active" ? sr.status !== "completed" : sr.status === "completed"
  );

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
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
            icon="💼"
            title={filter === "Active" ? "No active jobs" : "No completed jobs"}
            description={
              filter === "Active"
                ? "Service requests assigned to you will appear here."
                : "Completed jobs will appear here."
            }
          />
        }
        renderItem={({ item }) => (
          <ServiceRequestCard request={item} perspective="worker" />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: {
    flexDirection: "row",
    margin: Spacing.base,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.md,
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  filterLabelActive: { color: Colors.white },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing["4xl"] },
});
