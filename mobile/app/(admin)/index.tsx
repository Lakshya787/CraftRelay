/**
 * app/(admin)/index.tsx — Admin overview dashboard.
 *
 * Shows platform-wide KPIs, recent audit events, and quick navigation.
 * All data from mockData — no backend calls.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import {
  MOCK_ADMIN_STATS,
  MOCK_AUDIT_LOGS,
  MOCK_ASSESSMENTS,
  MOCK_SERVICE_REQUESTS,
} from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";

interface StatTileProps {
  value: number | string;
  label: string;
  sub?: string;
  accent?: string;
  onPress?: () => void;
}

function StatTile({ value, label, sub, accent, onPress }: StatTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statTile, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const stats = MOCK_ADMIN_STATS;
  const recentLogs = MOCK_AUDIT_LOGS.slice(0, 4);
  const pendingAssessments = MOCK_ASSESSMENTS.filter(
    (a) => a.status === "pending" || a.status === "in_progress"
  );
  const openRequests = MOCK_SERVICE_REQUESTS.filter((r) => r.status === "open");

  const verificationRate = Math.round(
    (stats.verifiedWorkers / stats.totalWorkers) * 100
  );
  const completionRate = Math.round(
    (stats.completedAssessments /
      (stats.completedAssessments + stats.pendingAssessments)) *
      100
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Admin greeting */}
      <View style={styles.greetRow}>
        <View>
          <Text style={styles.adminBadge}>ADMIN</Text>
          <Text style={styles.greeting}>Platform Overview</Text>
          <Text style={styles.greetSub}>{user?.name}</Text>
        </View>
        <Pressable onPress={() => { logout(); router.replace("/"); }}>
          <Avatar name={user?.name ?? "A"} size={46} backgroundColor={Colors.roleAdmin} />
        </Pressable>
      </View>

      {/* Platform health banner */}
      <Card style={styles.healthCard}>
        <View style={styles.healthRow}>
          <View style={styles.healthItem}>
            <Text style={styles.healthPct}>{verificationRate}%</Text>
            <Text style={styles.healthLabel}>Workers Verified</Text>
          </View>
          <View style={styles.healthDivider} />
          <View style={styles.healthItem}>
            <Text style={styles.healthPct}>{completionRate}%</Text>
            <Text style={styles.healthLabel}>Assessment Completion</Text>
          </View>
          <View style={styles.healthDivider} />
          <View style={styles.healthItem}>
            <Text style={styles.healthPct}>{stats.openServiceRequests}</Text>
            <Text style={styles.healthLabel}>Open Requests</Text>
          </View>
        </View>
      </Card>

      {/* KPI grid */}
      <View style={styles.kpiGrid}>
        <StatTile
          value={stats.totalWorkers.toLocaleString("en-IN")}
          label="Total Workers"
          sub={`${stats.verifiedWorkers.toLocaleString("en-IN")} verified`}
          accent={Colors.primary}
          onPress={() => router.push("/(admin)/users")}
        />
        <StatTile
          value={stats.totalAssessors}
          label="Assessors"
          sub="Active reviewers"
          accent={Colors.roleAssessor}
          onPress={() => router.push("/(admin)/users")}
        />
        <StatTile
          value={stats.totalCustomers.toLocaleString("en-IN")}
          label="Customers"
          sub="Registered"
          accent={Colors.roleCustomer}
          onPress={() => router.push("/(admin)/users")}
        />
        <StatTile
          value={stats.pendingAssessments}
          label="Pending Assessments"
          sub="Awaiting review"
          accent={Colors.warning}
          onPress={() => router.push("/(admin)/assessments")}
        />
        <StatTile
          value={stats.completedAssessments}
          label="Completed Assessments"
          accent={Colors.success}
          onPress={() => router.push("/(admin)/assessments")}
        />
        <StatTile
          value={stats.completedServiceRequests.toLocaleString("en-IN")}
          label="Completed Jobs"
          sub="All time"
          accent={Colors.teal}
        />
      </View>

      {/* Attention needed */}
      {(pendingAssessments.length > 0 || openRequests.length > 0) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Needs Attention</Text>
          {pendingAssessments.length > 0 ? (
            <Card
              onPress={() => router.push("/(admin)/assessments")}
              style={styles.attentionCard}
            >
              <View style={styles.attentionRow}>
                <Text style={styles.attentionIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attentionTitle}>
                    {pendingAssessments.length} assessment{pendingAssessments.length !== 1 ? "s" : ""} pending review
                  </Text>
                  <Text style={styles.attentionSub}>
                    Tap to view assessment queue
                  </Text>
                </View>
                <Badge label="Review" variant="warning" size="sm" />
              </View>
            </Card>
          ) : null}
          {openRequests.length > 0 ? (
            <Card style={styles.attentionCard}>
              <View style={styles.attentionRow}>
                <Text style={styles.attentionIcon}>📬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attentionTitle}>
                    {openRequests.length} open service request{openRequests.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.attentionSub}>
                    Unmatched requests on the platform
                  </Text>
                </View>
                <Badge label={String(openRequests.length)} variant="primary" size="sm" />
              </View>
            </Card>
          ) : null}
        </View>
      ) : null}

      {/* Recent audit log */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => router.push("/(admin)/logs")}>
            <Text style={styles.seeAll}>See all logs</Text>
          </Pressable>
        </View>
        <Card padded={false}>
          {recentLogs.map((log, index) => (
            <View key={log.id}>
              <View style={styles.logRow}>
                <Avatar name={log.actor.name} size={34} backgroundColor={Colors.gray200} />
                <View style={styles.logInfo}>
                  <Text style={styles.logAction}>{log.action.replace(".", " › ")}</Text>
                  <Text style={styles.logActor} numberOfLines={1}>
                    {log.actor.name} · {log.details}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
              {index < recentLogs.length - 1 ? <Divider spacing={0} /> : null}
            </View>
          ))}
        </Card>
      </View>

      {/* Sign out */}
      <Pressable
        style={styles.signOutBtn}
        onPress={() => { logout(); router.replace("/"); }}
      >
        <Text style={styles.signOutText}>🚪  Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing["4xl"] },

  greetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.roleAdmin,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  greeting: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  greetSub: { fontSize: 13, color: Colors.textSecondary },

  healthCard: {
    backgroundColor: Colors.backgroundDark,
    borderColor: Colors.backgroundDark,
  },
  healthRow: { flexDirection: "row", justifyContent: "space-around" },
  healthItem: { alignItems: "center", gap: 3, flex: 1 },
  healthPct: { fontSize: 22, fontWeight: "800", color: Colors.white },
  healthLabel: { fontSize: 10, color: Colors.gray400, textAlign: "center" },
  healthDivider: { width: 1, backgroundColor: Colors.gray700, marginVertical: Spacing.xs },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statTile: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.md,
    gap: 3,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  statSub: { fontSize: 10, color: Colors.textMuted, textAlign: "center" },

  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: "600" },

  attentionCard: {
    borderColor: Colors.warningBg,
    backgroundColor: Colors.warningBg,
  },
  attentionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  attentionIcon: { fontSize: 22 },
  attentionTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  attentionSub: { fontSize: 12, color: Colors.textSecondary },

  logRow: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    alignItems: "flex-start",
  },
  logInfo: { flex: 1, gap: 2 },
  logAction: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  logActor: { fontSize: 12, color: Colors.textSecondary },
  logTime: { fontSize: 11, color: Colors.textMuted },

  signOutBtn: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  signOutText: { fontSize: 14, color: Colors.error, fontWeight: "600" },
});
