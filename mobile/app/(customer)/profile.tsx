/**
 * app/(customer)/profile.tsx — Customer Profile Screen.
 *
 * Displays user identity, role badge, request stats (total and completed),
 * and a sign-out action.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import { useServiceRequests } from "../../hooks/useMarketplace";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { Button } from "../../components/ui/Button";

export default function CustomerProfileScreen() {
  const { user, logout } = useAuth();
  const { requests, loading, refetch } = useServiceRequests();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const name = user?.name || "Customer";
  const email = user?.email || "customer@craftrelay.app";
  const totalRequests = requests.length;
  const completedRequests = requests.filter((r) => r.status === "completed").length;
  const activeRequests = requests.filter(
    (r) =>
      r.status === "requested" ||
      r.status === "accepted" ||
      r.status === "in_progress" ||
      r.status === "completion_pending"
  ).length;

  async function handleSignOut() {
    await logout();
    router.replace("/login" as any);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Profile Hero Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Avatar name={name} size={68} backgroundColor={Colors.roleCustomer} />
          <View style={styles.heroInfo}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userEmail}>{email}</Text>
            <View style={styles.roleBadgeContainer}>
              <Badge label="Customer" variant="teal" size="sm" />
            </View>
          </View>
        </View>

        <Divider spacing={Spacing.md} />

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalRequests}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.teal }]}>
              {activeRequests}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {completedRequests}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </Card>

      {/* Account Details */}
      <Card style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <Divider spacing={Spacing.xs} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Name</Text>
          <Text style={styles.infoValue}>{name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>Customer (Hiring)</Text>
        </View>
      </Card>

      {/* Sign Out Card */}
      <Card style={styles.actionCard}>
        <Button
          label="Sign Out"
          variant="danger"
          size="lg"
          fullWidth
          onPress={handleSignOut}
          accessibilityLabel="Sign out of your account"
        />
      </Card>

      <Text style={styles.versionNote}>CraftRelay v1.0.0 · SIH 2025</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  heroCard: {
    gap: Spacing.sm,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: Spacing.base,
    alignItems: "center",
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  roleBadgeContainer: {
    marginTop: 2,
    alignSelf: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.xs,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.divider,
  },
  detailsCard: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  actionCard: {
    marginTop: Spacing.sm,
  },
  versionNote: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
