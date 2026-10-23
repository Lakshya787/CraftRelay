/**
 * app/(worker)/index.tsx — Worker dashboard screen.
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
import { useWorkerProfile, useWorkerVerifications } from "../../hooks/useWorkerProfile";
import { useAssessmentCases } from "../../hooks/useAssessments";
import { useServiceRequests } from "../../hooks/useMarketplace";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useWorkerProfile();
  const { verifications, loading: verificationsLoading, error: verificationsError, refetch: refetchVerifications } = useWorkerVerifications();
  const { cases, loading: casesLoading, error: casesError, refetch: refetchCases } = useAssessmentCases();
  const { requests, loading: requestsLoading, error: requestsError, refetch: refetchRequests } = useServiceRequests();
  const loading = profileLoading || verificationsLoading || casesLoading || requestsLoading;
  const error = profileError || verificationsError || casesError || requestsError;
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const activeCases = cases.filter((c) => !["approved", "rejected", "withdrawn"].includes(c.status));
  const activeJobs = requests.filter((r) => ["requested", "accepted", "in_progress", "completion_pending"].includes(r.status));
  async function retryDashboard() {
    await Promise.all([refetchProfile(), refetchVerifications(), refetchCases(), refetchRequests()]);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <Pressable onPress={() => router.push("/(worker)/profile")}>
          <Avatar name={user?.name ?? "U"} size={46} />
        </Pressable>
      </View>

      {loading ? <LoadingState message="Loading your saved profile…" /> : null}
      {error ? <ErrorState message={error} onRetry={retryDashboard} /> : null}
      {profile && !loading ? (
        <Card style={styles.completenessCard}>
          <Text style={styles.completenessTitle}>{profile.trade_title || "Add your trade"}</Text>
          <Text style={styles.completenessHint}>
            {[profile.city, profile.state].filter(Boolean).join(", ") || "Add your location"}
          </Text>
          <Button label="View Profile" variant="outline" size="sm" onPress={() => router.push("/(worker)/profile")} style={styles.completenessBtn} />
        </Card>
      ) : null}

      {/* Stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{requests.filter((r) => r.status === "completed").length}</Text>
          <Text style={styles.statLabel}>Completed Jobs</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>★ {profile?.average_rating?.toFixed(1) ?? "—"}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified Qualifications</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{activeCases.length}</Text>
          <Text style={styles.statLabel}>Active Assessments</Text>
        </Card>
      </View>

      {/* Assessments */}
      {activeCases.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Assessments</Text>
            <Pressable onPress={() => router.push("/(worker)/qualifications")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {activeCases.slice(0, 2).map((a) => (
            <Card key={a.id} style={styles.assessmentCard}>
              <View style={styles.assessmentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assessmentTitle}>{a.qualification_title}</Text>
                  <Text style={styles.assessmentSub}>{a.unresolved_criterion_count} criteria need follow-up</Text>
                </View>
                <Text style={styles.assessmentSub}>{a.status.replaceAll("_", " ")}</Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Active jobs */}
      {activeJobs.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Jobs</Text>
            <Pressable onPress={() => router.push("/(worker)/jobs")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {activeJobs.slice(0, 2).map((job) => <Card key={job.id}><Text style={styles.assessmentTitle}>{job.title}</Text><Text style={styles.assessmentSub}>{job.status.replaceAll("_", " ")}</Text></Card>)}
        </View>
      ) : null}

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickBtn}
            onPress={() => router.push("/(worker)/qualifications")}
          >
            <Text style={styles.quickIcon}>📤</Text>
            <Text style={styles.quickLabel}>Submit Evidence</Text>
          </Pressable>
          <Pressable
            style={styles.quickBtn}
            onPress={() => router.push("/(worker)/profile")}
          >
            <Text style={styles.quickIcon}>✏️</Text>
            <Text style={styles.quickLabel}>Edit Profile</Text>
          </Pressable>
          <Pressable
            style={styles.quickBtn}
            onPress={() => {
              logout();
              router.replace("/");
            }}
          >
            <Text style={styles.quickIcon}>🚪</Text>
            <Text style={styles.quickLabel}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
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
  greeting: { fontSize: 14, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary, flexShrink: 1 },
  completenessCard: {
    gap: Spacing.sm,
    backgroundColor: "#EBF2FF",
    borderColor: Colors.primary + "30",
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completenessTitle: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  completenessPercent: { fontSize: 15, fontWeight: "800", color: Colors.primary },
  completenessHint: { fontSize: 12, color: Colors.textSecondary },
  completenessBtn: { alignSelf: "flex-start" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.base,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  assessmentCard: { gap: Spacing.sm },
  assessmentRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  assessmentTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  assessmentSub: { fontSize: 12, color: Colors.textSecondary },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  scoreText: { fontSize: 12, fontWeight: "700", color: Colors.success, minWidth: 48 },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: "center",
    paddingVertical: Spacing.base,
    gap: Spacing.xs,
  },
  quickIcon: { fontSize: 24 },
  quickLabel: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary, textAlign: "center" },
});
