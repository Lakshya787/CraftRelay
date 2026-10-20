/**
 * app/(worker)/jobs.tsx — Worker Service Request / Job Management Screen.
 *
 * Displays service requests assigned to the worker, categorised into
 * Pending (awaiting acceptance), Active (in progress/completion pending),
 * and Completed (finished or closed).
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { useServiceRequests } from "../../hooks/useMarketplace";
import type { ApiServiceRequest } from "../../types/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { RequestStatusBadge } from "../(customer)/requests";

const FILTERS = ["Pending", "Active", "Completed"] as const;
type WorkerJobFilter = (typeof FILTERS)[number];

export default function WorkerJobsScreen() {
  const [filter, setFilter] = useState<WorkerJobFilter>("Pending");
  const { requests, loading, error, refetch } = useServiceRequests();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const filteredJobs = useMemo(() => {
    return requests.filter((r) => {
      if (filter === "Pending") {
        return r.status === "requested";
      }
      if (filter === "Active") {
        return (
          r.status === "accepted" ||
          r.status === "in_progress" ||
          r.status === "completion_pending"
        );
      }
      if (filter === "Completed") {
        return (
          r.status === "completed" ||
          r.status === "declined" ||
          r.status === "cancelled"
        );
      }
      return true;
    });
  }, [requests, filter]);

  function renderJobItem({ item }: { item: ApiServiceRequest }) {
    const customerName = item.customer_name || "Customer";
    const dateStr = item.preferred_date
      ? item.preferred_date
      : item.created_at
      ? new Date(item.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/(worker)/job/${item.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`View job ${item.title}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <RequestStatusBadge status={item.status} />
        </View>

        <Text style={styles.customerLine}>
          👤 Customer: <Text style={styles.customerName}>{customerName}</Text>
        </Text>

        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          {item.service_location ? (
            <Text style={styles.metaText} numberOfLines={1}>
              📍 {item.service_location}
            </Text>
          ) : null}
          {dateStr ? (
            <Text style={styles.metaText}>🗓️ {dateStr}</Text>
          ) : null}
          {item.agreed_price ? (
            <Text style={styles.priceText}>₹{item.agreed_price}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${f}`}
            >
              <Text
                style={[
                  styles.filterLabel,
                  filter === f && styles.filterLabelActive,
                ]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Jobs List */}
      {loading && !refreshing ? (
        <LoadingState message="Loading assigned jobs…" fullScreen />
      ) : error ? (
        <ErrorState
          title="Could not load jobs"
          message={error}
          onRetry={refetch}
        />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="💼"
              title={
                filter === "Pending"
                  ? "No pending requests"
                  : filter === "Active"
                  ? "No active jobs"
                  : "No completed jobs"
              }
              description={
                filter === "Pending"
                  ? "When customers request your service, they will appear here for you to accept or decline."
                  : filter === "Active"
                  ? "Jobs currently underway will appear here."
                  : "Completed or archived jobs will appear here."
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  filterRow: {
    flexDirection: "row",
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
  filterBtnActive: {
    backgroundColor: Colors.primary,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.base,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  jobTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  customerLine: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  customerName: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  descText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xs,
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceText: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: "800",
    color: Colors.teal,
  },
});
