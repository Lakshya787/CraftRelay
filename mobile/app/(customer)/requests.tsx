/**
 * app/(customer)/requests.tsx — Customer Service Requests List.
 *
 * Displays all service requests initiated by the customer with status badges,
 * filter tabs (All, Active, Completed, Declined), and pull-to-refresh.
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
import type { ApiServiceRequest, ServiceRequestStatus } from "../../types/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";

const FILTERS = ["All", "Active", "Completed", "Declined"] as const;
type FilterTab = (typeof FILTERS)[number];

export const STATUS_CONFIG: Record<
  ServiceRequestStatus,
  { label: string; color: string; bg: string }
> = {
  requested: {
    label: "Awaiting Response",
    color: "#0284C7", // blue
    bg: "#E0F2FE",
  },
  accepted: {
    label: "Accepted",
    color: "#0F4C81", // navy
    bg: "#E8F0FB",
  },
  declined: {
    label: "Declined",
    color: "#DC2626", // red
    bg: "#FEE2E2",
  },
  in_progress: {
    label: "In Progress",
    color: "#D97706", // amber
    bg: "#FEF3C7",
  },
  completion_pending: {
    label: "Awaiting Confirmation",
    color: "#7C3AED", // purple
    bg: "#EDE9FE",
  },
  completed: {
    label: "Completed",
    color: "#16A34A", // green
    bg: "#DCFCE7",
  },
  cancelled: {
    label: "Cancelled",
    color: "#6B7280", // grey
    bg: "#F3F4F6",
  },
};

export function RequestStatusBadge({ status }: { status: ServiceRequestStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    color: Colors.textSecondary,
    bg: Colors.backgroundMuted,
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: config.color }]} />
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

export default function CustomerRequestsScreen() {
  const [filter, setFilter] = useState<FilterTab>("All");
  const { requests, loading, error, refetch } = useServiceRequests();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filter === "All") return true;
      if (filter === "Active") {
        return (
          r.status === "requested" ||
          r.status === "accepted" ||
          r.status === "in_progress" ||
          r.status === "completion_pending"
        );
      }
      if (filter === "Completed") {
        return r.status === "completed";
      }
      if (filter === "Declined") {
        return r.status === "declined" || r.status === "cancelled";
      }
      return true;
    });
  }, [requests, filter]);

  function renderItem({ item }: { item: ApiServiceRequest }) {
    const dateStr = item.preferred_date
      ? item.preferred_date
      : item.created_at
      ? new Date(item.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

    const workerName = item.worker_name || "Assigned Worker";

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/(customer)/request/${item.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`View request: ${item.title}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <RequestStatusBadge status={item.status} />
        </View>

        <Text style={styles.workerText}>
          👤 Worker: <Text style={styles.workerNameText}>{workerName}</Text>
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
      <View style={styles.topFilterBar}>
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

      {/* Main List */}
      {loading && !refreshing ? (
        <LoadingState message="Loading your requests…" fullScreen />
      ) : error ? (
        <ErrorState
          title="Could not load requests"
          message={error}
          onRetry={refetch}
        />
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
              icon="📋"
              title={
                filter === "All"
                  ? "No requests yet"
                  : `No ${filter.toLowerCase()} requests`
              }
              description={
                filter === "All"
                  ? "You have not submitted any service requests yet. Find a verified professional to get started!"
                  : `You don't have any requests in the "${filter}" category.`
              }
              actionLabel={filter === "All" ? "Find Workers" : undefined}
              onAction={
                filter === "All"
                  ? () => router.push("/(customer)" as any)
                  : undefined
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
  topFilterBar: {
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
    backgroundColor: Colors.backgroundCard,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.textPrimary,
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
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  workerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  workerNameText: {
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
