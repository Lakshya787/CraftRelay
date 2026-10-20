/**
 * app/(customer)/index.tsx — Worker Discovery Screen.
 *
 * Allows customers to browse, search, and filter skilled workers across trades,
 * skills, and locations, distinguishing assessor-verified competencies from
 * self-reported skills.
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
import { useWorkers } from "../../hooks/useMarketplace";
import type { ApiWorkerSummary } from "../../types/api";
import { TextInput } from "../../components/ui/TextInput";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";

type FilterType = "all" | "verified" | "available";

export default function DiscoverWorkersScreen() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [showCityInput, setShowCityInput] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");

  const queryParams = useMemo(() => {
    return {
      trade: search.trim() || undefined,
      city: cityFilter.trim() || undefined,
      verified_only: filterType === "verified" ? true : undefined,
    };
  }, [search, cityFilter, filterType]);

  const { workers, loading, error, refetch } = useWorkers(queryParams);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  // Filter client-side for available if chosen or for name matching
  const displayedWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (filterType === "available" && !w.is_available) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesName = (w.full_name ?? "").toLowerCase().includes(query);
        const matchesTrade = (w.trade_title ?? "").toLowerCase().includes(query);
        const matchesCity = (w.city ?? "").toLowerCase().includes(query);
        return matchesName || matchesTrade || matchesCity;
      }
      return true;
    });
  }, [workers, filterType, search]);

  function handleResetFilters() {
    setSearch("");
    setCityFilter("");
    setFilterType("all");
    setShowCityInput(false);
  }

  function renderWorkerItem({ item }: { item: ApiWorkerSummary }) {
    const isVerified =
      item.has_verified_competencies ||
      (item as any).is_verified ||
      filterType === "verified";

    const availabilityColor = item.is_available ? Colors.success : Colors.textMuted;
    const name = item.full_name || "Professional Worker";
    const trade = item.trade_title || "Skilled Craftsman";
    const location = [item.city, item.state].filter(Boolean).join(", ") || "India";

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/(customer)/worker/${item.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${name}, ${trade}`}
      >
        <View style={styles.cardHeader}>
          <Avatar name={name} size={50} backgroundColor={Colors.primary} />
          <View style={styles.headerInfo}>
            <Text style={styles.workerName}>{name}</Text>
            <Text style={styles.tradeTitle}>{trade}</Text>
            <Text style={styles.locationText}>📍 {location}</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingStar}>
              ★ {item.average_rating ? item.average_rating.toFixed(1) : "—"}
            </Text>
            <Text style={styles.reviewCountText}>
              {item.total_reviews} {item.total_reviews === 1 ? "review" : "reviews"}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {/* Availability dot */}
          <View style={styles.availabilityRow}>
            <View style={[styles.availDot, { backgroundColor: availabilityColor }]} />
            <Text style={[styles.availLabel, { color: availabilityColor }]}>
              {item.is_available ? "Available" : "Unavailable"}
            </Text>
          </View>

          {/* Verification Badge: Strictly distinguishes Assessor-Verified vs Self-Reported */}
          {isVerified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeIcon}>✓</Text>
              <Text style={styles.verifiedBadgeText}>Assessor-Verified</Text>
            </View>
          ) : (
            <View style={styles.selfReportedBadge}>
              <Text style={styles.selfReportedBadgeText}>Self-Reported</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Search & Filter Header */}
      <View style={styles.headerContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by trade, skill, or name…"
          containerStyle={styles.searchInput}
          leftIcon={<Text style={styles.searchIcon}>🔍</Text>}
          rightIcon={
            search.length > 0 ? (
              <Pressable
                onPress={() => setSearch("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            ) : undefined
          }
        />

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, filterType === "all" && styles.filterChipActive]}
            onPress={() => setFilterType("all")}
            accessibilityRole="button"
            accessibilityLabel="Show all workers"
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === "all" && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filterType === "verified" && styles.filterChipTealActive,
            ]}
            onPress={() => setFilterType("verified")}
            accessibilityRole="button"
            accessibilityLabel="Show verified workers only"
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === "verified" && styles.filterChipTextTealActive,
              ]}
            >
              ✓ Verified
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filterType === "available" && styles.filterChipActive,
            ]}
            onPress={() => setFilterType("available")}
            accessibilityRole="button"
            accessibilityLabel="Show available workers only"
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === "available" && styles.filterChipTextActive,
              ]}
            >
              Available
            </Text>
          </Pressable>

          {/* Toggle city filter button */}
          <Pressable
            style={[
              styles.filterChip,
              (showCityInput || cityFilter.length > 0) && styles.filterChipCityActive,
            ]}
            onPress={() => setShowCityInput((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Filter by city"
          >
            <Text
              style={[
                styles.filterChipText,
                (showCityInput || cityFilter.length > 0) && styles.filterChipTextCityActive,
              ]}
            >
              📍 {cityFilter ? cityFilter : "City"}
            </Text>
          </Pressable>
        </View>

        {/* Collapsible City Filter */}
        {showCityInput && (
          <View style={styles.cityInputWrapper}>
            <TextInput
              value={cityFilter}
              onChangeText={setCityFilter}
              placeholder="Enter city name (e.g. Mumbai, Delhi)…"
              autoFocus
              rightIcon={
                cityFilter.length > 0 ? (
                  <Pressable
                    onPress={() => setCityFilter("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear city filter"
                  >
                    <Text style={styles.clearIcon}>✕</Text>
                  </Pressable>
                ) : undefined
              }
            />
          </View>
        )}
      </View>

      {/* Results Header */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCount}>
          {displayedWorkers.length} {displayedWorkers.length === 1 ? "worker" : "workers"} found
        </Text>
        {(search || cityFilter || filterType !== "all") && (
          <Pressable onPress={handleResetFilters} accessibilityRole="button">
            <Text style={styles.resetFiltersText}>Reset filters</Text>
          </Pressable>
        )}
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <LoadingState message="Discovering skilled workers…" fullScreen />
      ) : error ? (
        <ErrorState
          title="Could not load workers"
          message={error}
          onRetry={refetch}
        />
      ) : (
        <FlatList
          data={displayedWorkers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkerItem}
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
              icon="🔍"
              title="No professionals found"
              description="Try modifying your trade search, clearing city filters, or toggling verification options."
              actionLabel="Clear Filters"
              onAction={handleResetFilters}
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
  headerContainer: {
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.backgroundMuted,
  },
  searchIcon: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    padding: Spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipTealActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  filterChipCityActive: {
    backgroundColor: "#E8F0FB",
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  filterChipTextTealActive: {
    color: Colors.white,
  },
  filterChipTextCityActive: {
    color: Colors.primary,
  },
  cityInputWrapper: {
    marginTop: Spacing.xs,
  },
  resultsInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  resetFiltersText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing["4xl"],
    paddingTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  tradeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ratingBox: {
    alignItems: "flex-end",
    gap: 2,
  },
  ratingStar: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.warning,
  },
  reviewCountText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.teal + "40",
  },
  verifiedBadgeIcon: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.tealDark,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.tealDark,
  },
  selfReportedBadge: {
    backgroundColor: Colors.backgroundMuted,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selfReportedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
