/**
 * app/(worker)/profile.tsx — Worker profile screen.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_WORKER_PROFILE, MOCK_REVIEWS } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { VerificationBadge } from "../../components/shared/VerificationBadge";
import { TextInput } from "../../components/ui/TextInput";

export default function WorkerProfileScreen() {
  const worker = MOCK_WORKER_PROFILE;
  const reviews = MOCK_REVIEWS;
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(worker.bio);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Profile header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Avatar name={worker.user.name} size={72} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{worker.user.name}</Text>
            <Text style={styles.location}>
              📍 {worker.city}, {worker.state}
            </Text>
            <View style={styles.ratingRow}>
              <Text style={styles.rating}>★ {worker.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({worker.reviewCount} reviews)</Text>
            </View>
            <View style={styles.badges}>
              <Badge
                label={
                  worker.availabilityStatus === "available"
                    ? "Available"
                    : worker.availabilityStatus === "busy"
                    ? "Busy"
                    : "Unavailable"
                }
                variant={
                  worker.availabilityStatus === "available"
                    ? "success"
                    : worker.availabilityStatus === "busy"
                    ? "warning"
                    : "default"
                }
                size="sm"
              />
            </View>
          </View>
        </View>

        <Divider />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{worker.completedJobs}</Text>
            <Text style={styles.statLbl}>Jobs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{worker.skills.length}</Text>
            <Text style={styles.statLbl}>Skills</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>
              ₹{worker.hourlyRate ?? "—"}
            </Text>
            <Text style={styles.statLbl}>Per Hour</Text>
          </View>
        </View>

        <Divider />

        {/* Profile completeness */}
        <View style={styles.completenessSection}>
          <View style={styles.completenessHeader}>
            <Text style={styles.completenessLabel}>Profile strength</Text>
            <Text style={styles.completenessVal}>{worker.profileCompleteness}%</Text>
          </View>
          <ProgressBar
            value={worker.profileCompleteness}
            color={
              worker.profileCompleteness >= 80
                ? Colors.success
                : worker.profileCompleteness >= 50
                ? Colors.warning
                : Colors.error
            }
          />
        </View>
      </Card>

      {/* Contact info */}
      <Card>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Divider spacing={Spacing.sm} />
        <View style={styles.contactList}>
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactValue}>{worker.user.email}</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📱</Text>
            <Text style={styles.contactValue}>{worker.user.phone}</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>🗣</Text>
            <Text style={styles.contactValue}>{worker.languages.join(", ")}</Text>
          </View>
        </View>
      </Card>

      {/* Bio */}
      <Card>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>About</Text>
          <Pressable onPress={() => setEditing(!editing)}>
            <Text style={styles.editLink}>{editing ? "Cancel" : "Edit"}</Text>
          </Pressable>
        </View>
        <Divider spacing={Spacing.sm} />
        {editing ? (
          <View style={styles.editBio}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={5}
              style={{ minHeight: 100 }}
            />
            <Button
              label="Save"
              variant="primary"
              size="sm"
              onPress={() => setEditing(false)}
              style={{ alignSelf: "flex-end" }}
            />
          </View>
        ) : (
          <Text style={styles.bioText}>{bio}</Text>
        )}
      </Card>

      {/* Skills */}
      <Card>
        <Text style={styles.sectionTitle}>Skills & Verification</Text>
        <Divider spacing={Spacing.sm} />
        <View style={styles.skillList}>
          {worker.skills.map((ws) => (
            <View key={ws.id} style={styles.skillRow}>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{ws.skill.name}</Text>
                <Text style={styles.skillMeta}>
                  {ws.level.charAt(0).toUpperCase() + ws.level.slice(1)} · {ws.yearsExperience} yr
                  {ws.yearsExperience !== 1 ? "s" : ""}
                </Text>
              </View>
              <VerificationBadge status={ws.verificationStatus} />
            </View>
          ))}
        </View>
      </Card>

      {/* Reviews */}
      {reviews.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          <Divider spacing={Spacing.sm} />
          <View style={styles.reviewList}>
            {reviews.slice(0, 3).map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Avatar name={r.reviewer.name} size={32} backgroundColor={Colors.teal} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{r.reviewer.name}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  <Text style={styles.reviewStars}>{"★".repeat(r.rating)}</Text>
                </View>
                <Text style={styles.reviewComment}>{r.comment}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing["4xl"] },
  headerCard: { gap: Spacing.md },
  headerTop: { flexDirection: "row", gap: Spacing.base, alignItems: "flex-start" },
  headerInfo: { flex: 1, gap: Spacing.xs },
  name: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  location: { fontSize: 13, color: Colors.textSecondary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  rating: { fontSize: 15, fontWeight: "700", color: Colors.warning },
  ratingCount: { fontSize: 12, color: Colors.textMuted },
  badges: { flexDirection: "row", gap: Spacing.xs, flexWrap: "wrap" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 3, flex: 1 },
  statVal: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  statLbl: { fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.divider },
  completenessSection: { gap: Spacing.xs },
  completenessHeader: { flexDirection: "row", justifyContent: "space-between" },
  completenessLabel: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary },
  completenessVal: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editLink: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  contactList: { gap: Spacing.sm },
  contactRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  contactIcon: { fontSize: 16, width: 24 },
  contactValue: { fontSize: 14, color: Colors.textPrimary },
  editBio: { gap: Spacing.sm },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  skillList: { gap: Spacing.md },
  skillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skillInfo: { gap: 2 },
  skillName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  skillMeta: { fontSize: 12, color: Colors.textMuted },
  reviewList: { gap: Spacing.base },
  reviewItem: { gap: Spacing.sm },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  reviewerName: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  reviewDate: { fontSize: 11, color: Colors.textMuted },
  reviewStars: { fontSize: 14, color: Colors.warning },
  reviewComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
