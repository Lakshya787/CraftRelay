/**
 * app/(customer)/requests.tsx — Customer service requests screen.
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
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

const FILTERS = ["Active", "Completed"] as const;
type Filter = typeof FILTERS[number];

export default function CustomerRequestsScreen() {
  const [filter, setFilter] = useState<Filter>("Active");

  // Filter to customer u6's requests
  const myRequests = MOCK_SERVICE_REQUESTS.filter((sr) => sr.customer.id === "u6");
  const filtered = myRequests.filter((sr) =>
    filter === "Active" ? sr.status !== "completed" : sr.status === "completed"
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
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
        <Button
          label="+ New Request"
          variant="primary"
          size="sm"
          onPress={() => {}}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="📬"
            title={filter === "Active" ? "No active requests" : "No completed requests"}
            description={
              filter === "Active"
                ? "Post a service request to find a verified professional."
                : "Your completed service requests will appear here."
            }
            actionLabel={filter === "Active" ? "Post a Request" : undefined}
            onAction={filter === "Active" ? () => {} : undefined}
          />
        }
        renderItem={({ item }) => (
          <ServiceRequestCard request={item} perspective="customer" />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  filterRow: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.lg,
    padding: 3,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: "center",
    borderRadius: Radius.md,
  },
  filterBtnActive: { backgroundColor: Colors.backgroundCard },
  filterLabel: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  filterLabelActive: { color: Colors.textPrimary },
  list: { padding: Spacing.base, paddingBottom: Spacing["4xl"] },
});
