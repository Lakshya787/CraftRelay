/**
 * app/(customer)/worker/[id].tsx — Worker Detail Screen for Customers.
 *
 * Displays full worker profile, assessor-verified competencies, declared skills,
 * years of experience, customer reviews, and a "Request Service" CTA.
 *
 * INVARIANT: Self-reported skills are strictly distinguished from assessor-verified
 * competencies and NEVER carry verified styling or badges.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Colors } from "../../../constants/colors";
import { Spacing, Radius } from "../../../constants/spacing";
import {
  useWorkerDetail,
  useWorkerSkills,
  useWorkerReviews,
} from "../../../hooks/useMarketplace";
import { Avatar } from "../../../components/ui/Avatar";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Divider } from "../../../components/ui/Divider";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workerId = Array.isArray(id) ? id[0] : id ?? "";

  const {
    worker,
    loading: workerLoading,
    error: workerError,
    refetch: refetchWorker,
  } = useWorkerDetail(workerId);

  const {
    skills,
    loading: skillsLoading,
    error: skillsError,
    refetch: refetchSkills,
  } = useWorkerSkills(workerId);

  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews,
  } = useWorkerReviews(workerId);

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchWorker(), refetchSkills(), refetchReviews()]);
    setRefreshing(false);
  }

  const isLoading = workerLoading || skillsLoading;
  const hasError = workerError || skillsError;

  if (isLoading && !refreshing) {
    return <LoadingState message="Loading worker profile…" fullScreen />;
  }

  if (hasError && !worker) {
    return (
      <ErrorState
        title="Worker profile not found"
        message={workerError || skillsError || "Unable to load profile"}
        onRetry={handleRefresh}
      />
    );
  }

  const name = worker?.full_name || "Skilled Worker";
  const trade = worker?.trade_title || "Tradesperson";
  const location = [worker?.city, worker?.state].filter(Boolean).join(", ") || "India";
  const rating = worker?.average_rating ? worker.average_rating.toFixed(1) : "—";
  const reviewCount = worker?.total_reviews ?? reviews.length;
  const verifiedList = skills?.verified_competencies ?? [];
  const declaredList = skills?.declared_skills ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header Hero */}
        <View style={styles.heroCard}>
          <Avatar name={name} size={74} backgroundColor={Colors.primary} />
          <View style={styles.heroText}>
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.tradeText}>{trade}</Text>
            <Text style={styles.locationText}>📍 {location}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.ratingStars}>★ {rating}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.metaReviewCount}>
                {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
              </Text>
              <Text style={styles.metaDivider}>•</Text>
              <View style={styles.availabilityInline}>
                <View
                  style={[
                    styles.availDot,
                    {
                      backgroundColor: worker?.is_available
                        ? Colors.success
                        : Colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.availText,
                    {
                      color: worker?.is_available
                        ? Colors.success
                        : Colors.textMuted,
                    },
                  ]}
                >
                  {worker?.is_available ? "Available" : "Unavailable"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Experience Overview */}
        {worker?.years_experience !== undefined && worker.years_experience !== null ? (
          <Card style={styles.expCard}>
            <View style={styles.expRow}>
              <View style={styles.expIconContainer}>
                <Text style={styles.expIcon}>⏱️</Text>
              </View>
              <View style={styles.expInfo}>
                <Text style={styles.expLabel}>Experience in Trade</Text>
                <Text style={styles.expValue}>
                  {worker.years_experience}{" "}
                  {worker.years_experience === 1 ? "year" : "years"} of professional work
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Bio Section */}
        {worker?.bio ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Divider spacing={Spacing.xs} />
            <Text style={styles.bioText}>{worker.bio}</Text>
          </Card>
        ) : null}

        {/* Skills Section — Sub-section 1: Assessor-Verified Competencies */}
        <Card style={styles.sectionCard}>
          <View style={styles.verifiedHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedSectionTitle}>
                Assessor-Verified Competencies
              </Text>
              <Text style={styles.verifiedSectionSubtitle}>
                Formally assessed and certified by accredited assessors
              </Text>
            </View>
            <View style={styles.verifiedCountBadge}>
              <Text style={styles.verifiedCountText}>{verifiedList.length}</Text>
            </View>
          </View>

          <Divider spacing={Spacing.xs} />

          {verifiedList.length === 0 ? (
            <View style={styles.emptySkillsBox}>
              <Text style={styles.emptySkillsText}>
                No formal assessor-verified competencies on file yet.
              </Text>
            </View>
          ) : (
            <View style={styles.skillsList}>
              {verifiedList.map((comp) => (
                <View key={comp.id} style={styles.verifiedItem}>
                  <View style={styles.verifiedItemHeader}>
                    <Text style={styles.verifiedItemTitle}>
                      {comp.qualification_title}
                    </Text>
                    <View style={styles.tealBadge}>
                      <Text style={styles.tealBadgeIcon}>✓</Text>
                      <Text style={styles.tealBadgeText}>Assessor-Verified</Text>
                    </View>
                  </View>
                  {comp.certificate_number ? (
                    <Text style={styles.certNumberText}>
                      Cert: #{comp.certificate_number}
                    </Text>
                  ) : null}
                  <Text style={styles.statusDetailText}>
                    Status: {comp.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Skills Section — Sub-section 2: Declared Skills (Self-Reported) */}
        <Card style={styles.sectionCard}>
          <View style={styles.declaredHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.declaredSectionTitle}>Self-Reported Skills</Text>
              <Text style={styles.declaredWarningNote}>
                ⚠️ Not independently verified
              </Text>
            </View>
            <View style={styles.declaredCountBadge}>
              <Text style={styles.declaredCountText}>{declaredList.length}</Text>
            </View>
          </View>

          <Divider spacing={Spacing.xs} />

          {declaredList.length === 0 ? (
            <View style={styles.emptySkillsBox}>
              <Text style={styles.emptySkillsText}>No self-reported skills declared.</Text>
            </View>
          ) : (
            <View style={styles.skillsList}>
              {declaredList.map((skill) => (
                <View key={skill.id} style={styles.declaredItem}>
                  <View style={styles.declaredItemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.declaredItemTitle}>{skill.skill_name}</Text>
                      <Text style={styles.declaredItemMeta}>
                        Proficiency: {skill.proficiency_level}
                        {skill.years_used ? ` · ${skill.years_used} yrs exp` : ""}
                      </Text>
                    </View>
                    {/* Strictly grey badge — NEVER teal or verified */}
                    <View style={styles.selfReportedBadge}>
                      <Text style={styles.selfReportedBadgeText}>Self-Reported</Text>
                    </View>
                  </View>
                  {skill.notes ? (
                    <Text style={styles.declaredNotes}>“{skill.notes}”</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Customer Reviews Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            <Text style={styles.reviewSummaryText}>
              ★ {rating} ({reviewCount})
            </Text>
          </View>
          <Divider spacing={Spacing.xs} />

          {reviewsLoading && !reviews.length ? (
            <Text style={styles.loadingReviewsText}>Loading reviews…</Text>
          ) : reviews.length === 0 ? (
            <View style={styles.emptyReviewsBox}>
              <Text style={styles.emptyReviewsText}>
                No customer reviews yet. Be the first to hire and review this professional!
              </Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((r) => {
                const dateStr = r.created_at
                  ? new Date(r.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "";
                const stars = "★".repeat(Math.max(1, Math.min(5, r.rating)));

                return (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewTopRow}>
                      <Avatar
                        name={r.customer_name || "Customer"}
                        size={32}
                        backgroundColor={Colors.teal}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewerName}>
                          {r.customer_name || "Verified Customer"}
                        </Text>
                        <Text style={styles.reviewDate}>{dateStr}</Text>
                      </View>
                      <Text style={styles.reviewStars}>{stars}</Text>
                    </View>
                    {r.comment ? (
                      <Text style={styles.reviewComment}>{r.comment}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.footerCTA}>
        <Button
          label="Request Service"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() =>
            router.push({
              pathname: "/(customer)/new-request",
              params: {
                workerId: workerId,
                workerName: worker?.full_name || "Worker",
              },
            } as any)
          }
          accessibilityLabel={`Request service from ${name}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing["5xl"],
  },
  heroCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    flexDirection: "row",
    gap: Spacing.base,
    alignItems: "flex-start",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  nameText: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  tradeText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
    flexWrap: "wrap",
  },
  ratingStars: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.warning,
  },
  metaDivider: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  metaReviewCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  availabilityInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  availText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expCard: {
    backgroundColor: "#F0FDF4",
    borderColor: Colors.successBg,
  },
  expRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  expIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  expIcon: {
    fontSize: 20,
  },
  expInfo: {
    flex: 1,
    gap: 2,
  },
  expLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.success,
  },
  expValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  bioText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  verifiedHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  verifiedSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.tealDark,
  },
  verifiedSectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifiedCountBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.teal + "50",
  },
  verifiedCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.tealDark,
  },
  declaredHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  declaredSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  declaredWarningNote: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.warning,
    marginTop: 2,
  },
  declaredCountBadge: {
    backgroundColor: Colors.backgroundMuted,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  declaredCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  skillsList: {
    gap: Spacing.sm,
  },
  verifiedItem: {
    backgroundColor: "#F0FDFA",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.teal + "35",
    gap: 4,
  },
  verifiedItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  verifiedItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.tealDark,
  },
  tealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.tealDark,
  },
  tealBadgeIcon: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.tealDark,
  },
  tealBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.tealDark,
  },
  certNumberText: {
    fontSize: 12,
    color: Colors.tealDark,
    fontWeight: "500",
  },
  statusDetailText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  declaredItem: {
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  declaredItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  declaredItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  declaredItemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selfReportedBadge: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  selfReportedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  declaredNotes: {
    fontSize: 12,
    fontStyle: "italic",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptySkillsBox: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  emptySkillsText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  reviewsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewSummaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.warning,
  },
  loadingReviewsText: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: Spacing.sm,
  },
  emptyReviewsBox: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  emptyReviewsText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  reviewsList: {
    gap: Spacing.md,
  },
  reviewItem: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  reviewTopRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  reviewStars: {
    fontSize: 13,
    color: Colors.warning,
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  footerCTA: {
    padding: Spacing.base,
    backgroundColor: Colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
