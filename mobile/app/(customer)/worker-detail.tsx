/**
 * app/(customer)/worker-detail.tsx — Worker detail / profile for customers.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_WORKERS, MOCK_REVIEWS } from "../../data/mockData";
import { IllustrativeDataNotice } from "../../components/shared/IllustrativeDataNotice";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { VerificationBadge } from "../../components/shared/VerificationBadge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const worker = MOCK_WORKERS.find((w) => w.id === id) ?? MOCK_WORKERS[0]!;
  const reviews = MOCK_REVIEWS.slice(0, 3);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  if (requestSent) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>📬</Text>
        <Text style={styles.successTitle}>Request Sent!</Text>
        <Text style={styles.successMessage}>
          Your service request has been sent to {worker.user.name}. You will be notified once they respond.
        </Text>
        <Button
          label="Back to Search"
          variant="primary"
          size="lg"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <IllustrativeDataNotice />
        {/* Hero */}
        <View style={styles.hero}>
          <Avatar name={worker.user.name} size={80} />
          <Text style={styles.name}>{worker.user.name}</Text>
          <Text style={styles.location}>📍 {worker.city}, {worker.state}</Text>
          <View style={styles.heroMeta}>
            <Text style={styles.rating}>★ {worker.rating.toFixed(1)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{worker.reviewCount} reviews</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{worker.completedJobs} jobs</Text>
          </View>
          <Badge
            label={
              worker.availabilityStatus === "available"
                ? "Available for work"
                : worker.availabilityStatus === "busy"
                ? "Currently busy"
                : "Not available"
            }
            variant={
              worker.availabilityStatus === "available"
                ? "success"
                : worker.availabilityStatus === "busy"
                ? "warning"
                : "default"
            }
          />
        </View>

        {/* Pricing */}
        {worker.hourlyRate ? (
          <Card style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Hourly rate</Text>
              <Text style={styles.priceValue}>₹{worker.hourlyRate}/hr</Text>
            </View>
            <Text style={styles.priceNote}>
              Final pricing is discussed directly with the worker.
            </Text>
          </Card>
        ) : null}

        {/* About */}
        <Card>
          <Text style={styles.sectionTitle}>About</Text>
          <Divider spacing={Spacing.sm} />
          <Text style={styles.bio}>{worker.bio}</Text>
          <View style={styles.langRow}>
            <Text style={styles.langLabel}>Languages: </Text>
            <Text style={styles.langValue}>{worker.languages.join(", ")}</Text>
          </View>
        </Card>

        {/* Skills & Verifications */}
        <Card>
          <Text style={styles.sectionTitle}>Skills & Certifications</Text>
          <Divider spacing={Spacing.sm} />
          {worker.skills.map((ws) => (
            <View key={ws.id} style={styles.skillRow}>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{ws.skill.name}</Text>
                <Text style={styles.skillMeta}>
                  {ws.level.charAt(0).toUpperCase() + ws.level.slice(1)} · {ws.yearsExperience} year{ws.yearsExperience !== 1 ? "s" : ""} experience
                </Text>
                <Text style={styles.skillCategory}>{ws.skill.category}</Text>
              </View>
              <VerificationBadge status={ws.verificationStatus} />
            </View>
          ))}
        </Card>

        {/* Reviews */}
        <Card>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          <Divider spacing={Spacing.sm} />
          <View style={styles.reviewList}>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Avatar name={r.reviewer.name} size={34} backgroundColor={Colors.teal} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{r.reviewer.name}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.reviewStars}>{"★".repeat(r.rating)}</Text>
                </View>
                <Text style={styles.reviewComment}>{r.comment}</Text>
                {reviews.indexOf(r) < reviews.length - 1 ? <Divider spacing={Spacing.sm} /> : null}
              </View>
            ))}
          </View>
        </Card>

        {/* CTA */}
        <Button
          label="Request Service"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => setShowRequestDialog(true)}
          style={styles.ctaBtn}
        />
      </ScrollView>

      <ConfirmDialog
        visible={showRequestDialog}
        title="Send Service Request?"
        message={`This will send a service request to ${worker.user.name}. They will review and accept or decline. You can add more details after accepting.`}
        confirmLabel="Send Request"
        onConfirm={() => { setRequestSent(true); setShowRequestDialog(false); }}
        onCancel={() => setShowRequestDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { gap: Spacing.base, paddingBottom: Spacing["4xl"] },
  hero: {
    backgroundColor: Colors.backgroundCard,
    alignItems: "center",
    padding: Spacing["2xl"],
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  name: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  location: { fontSize: 14, color: Colors.textSecondary },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rating: { fontSize: 15, fontWeight: "700", color: Colors.warning },
  metaDot: { color: Colors.textMuted, fontSize: 14 },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  priceCard: {
    marginHorizontal: Spacing.base,
    gap: Spacing.xs,
    backgroundColor: "#EBF2FF",
    borderColor: Colors.primary + "30",
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 14, color: Colors.textSecondary },
  priceValue: { fontSize: 20, fontWeight: "800", color: Colors.teal },
  priceNote: { fontSize: 11, color: Colors.textMuted },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  bio: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  langRow: { flexDirection: "row", marginTop: Spacing.sm },
  langLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  langValue: { fontSize: 13, color: Colors.textSecondary },
  skillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  skillInfo: { gap: 2 },
  skillName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  skillMeta: { fontSize: 12, color: Colors.textMuted },
  skillCategory: { fontSize: 11, color: Colors.textMuted, fontStyle: "italic" },
  reviewList: { gap: Spacing.sm },
  reviewItem: {},
  reviewHeader: { flexDirection: "row", gap: Spacing.sm, alignItems: "center", marginBottom: Spacing.xs },
  reviewerName: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  reviewDate: { fontSize: 11, color: Colors.textMuted },
  reviewStars: { fontSize: 14, color: Colors.warning },
  reviewComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  ctaBtn: { marginHorizontal: Spacing.base },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.base,
  },
  successIcon: { fontSize: 56 },
  successTitle: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary },
  successMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },
});
