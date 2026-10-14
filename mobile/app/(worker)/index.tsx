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
import { MOCK_WORKER_PROFILE, MOCK_ASSESSMENTS, MOCK_SERVICE_REQUESTS } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatusIndicator } from "../../components/shared/StatusIndicator";
import { ServiceRequestCard } from "../../components/shared/ServiceRequestCard";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const worker = MOCK_WORKER_PROFILE;
  const myAssessments = MOCK_ASSESSMENTS.filter((a) => a.worker.user.id === user?.id);
  const myJobs = MOCK_SERVICE_REQUESTS.filter(
    (r) => r.worker?.user.id === user?.id && r.status !== "completed"
  );

  const verifiedCount = worker.skills.filter((s) => s.verificationStatus === "verified").length;
  const pendingCount = worker.skills.filter((s) => s.verificationStatus === "pending").length;

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

      {/* Profile completeness */}
      {worker.profileCompleteness < 100 ? (
        <Card style={styles.completenessCard}>
          <View style={styles.completenessHeader}>
            <Text style={styles.completenessTitle}>Complete your profile</Text>
            <Text style={styles.completenessPercent}>{worker.profileCompleteness}%</Text>
          </View>
          <ProgressBar value={worker.profileCompleteness} color={Colors.primary} />
          <Text style={styles.completenessHint}>
            A complete profile gets 3× more service requests.
          </Text>
          <Button
            label="Update Profile"
            variant="outline"
            size="sm"
            onPress={() => router.push("/(worker)/profile")}
            style={styles.completenessBtn}
          />
        </Card>
      ) : null}

      {/* Stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{worker.completedJobs}</Text>
          <Text style={styles.statLabel}>Completed Jobs</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>★ {worker.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified Skills</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Under Review</Text>
        </Card>
      </View>

      {/* Assessments */}
      {myAssessments.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Assessments</Text>
            <Pressable onPress={() => router.push("/(worker)/qualifications")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {myAssessments.slice(0, 2).map((a) => (
            <Card key={a.id} style={styles.assessmentCard}>
              <View style={styles.assessmentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assessmentTitle}>{a.qualification.title}</Text>
                  <Text style={styles.assessmentSub}>{a.qualification.skill.name}</Text>
                </View>
                <StatusIndicator status={a.status} />
              </View>
              {a.overallScore !== undefined ? (
                <View style={styles.scoreRow}>
                  <ProgressBar value={a.overallScore} color={Colors.success} />
                  <Text style={styles.scoreText}>{a.overallScore}/100</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      {/* Active jobs */}
      {myJobs.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Jobs</Text>
            <Pressable onPress={() => router.push("/(worker)/jobs")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {myJobs.slice(0, 2).map((sr) => (
            <ServiceRequestCard
              key={sr.id}
              request={sr}
              perspective="worker"
              onPress={() => router.push(`/(worker)/jobs`)}
            />
          ))}
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
  name: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
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
