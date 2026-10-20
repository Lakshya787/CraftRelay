/**
 * app/(customer)/request/[id].tsx — Customer Service Request Detail Screen.
 *
 * Shows full request details, worker info card, current status,
 * cancellation, completion confirmation, and post-completion reviews.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Colors } from "../../../constants/colors";
import { Spacing, Radius } from "../../../constants/spacing";
import {
  useServiceRequestDetail,
  useServiceRequestReviews,
  useWorkerDetail,
  useCancelRequest,
  useCustomerConfirm,
  usePostReview,
} from "../../../hooks/useMarketplace";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Avatar } from "../../../components/ui/Avatar";
import { Divider } from "../../../components/ui/Divider";
import { TextInput } from "../../../components/ui/TextInput";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { RequestStatusBadge } from "../requests";

export default function ServiceRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Array.isArray(id) ? id[0] : id ?? "";

  const {
    request,
    loading: requestLoading,
    error: requestError,
    refetch: refetchRequest,
  } = useServiceRequestDetail(requestId);

  const {
    reviews,
    loading: reviewsLoading,
    refetch: refetchReviews,
  } = useServiceRequestReviews(requestId);

  const { worker } = useWorkerDetail(request?.worker_profile_id ?? "");

  const { cancelRequest, loading: cancelling } = useCancelRequest();
  const { customerConfirm, loading: confirming } = useCustomerConfirm();
  const { postReview, loading: postingReview, error: postReviewError } = usePostReview();

  const [refreshing, setRefreshing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");

  // Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchRequest(), refetchReviews()]);
    setRefreshing(false);
  }

  async function handleConfirmCancel() {
    try {
      setShowCancelDialog(false);
      await cancelRequest(requestId);
      await refetchRequest();
      Alert.alert("Request Cancelled", "Your service request has been cancelled.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to cancel request.");
    }
  }

  async function handleConfirmCompletion() {
    try {
      await customerConfirm(requestId, {
        customer_notes: customerNotes.trim() || undefined,
      });
      setShowConfirmModal(false);
      await refetchRequest();
      Alert.alert("Service Completed", "Thank you for confirming the service completion!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to confirm completion.");
    }
  }

  async function handleSubmitReview() {
    if (rating < 1 || rating > 5) {
      Alert.alert("Rating required", "Please select a rating between 1 and 5 stars.");
      return;
    }

    try {
      await postReview(requestId, {
        rating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSuccess(true);
      setShowReviewForm(false);
      await refetchReviews();
      await refetchRequest();
    } catch {
      // postReviewError displays error banner
    }
  }

  if (requestLoading && !refreshing) {
    return <LoadingState message="Loading request details…" fullScreen />;
  }

  if (requestError && !request) {
    return (
      <ErrorState
        title="Request not found"
        message={requestError}
        onRetry={handleRefresh}
      />
    );
  }

  if (!request) {
    return (
      <ErrorState
        title="Request not found"
        message="This service request does not exist or has been removed."
        onRetry={handleRefresh}
      />
    );
  }

  const workerName = request.worker_name || worker?.full_name || "Assigned Worker";
  const workerTrade = worker?.trade_title || "Skilled Craftsman";
  const hasReview = reviews.length > 0;
  const existingReview = reviews[0];

  const dateStr = request.preferred_date
    ? request.preferred_date
    : request.created_at
    ? new Date(request.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

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
        {/* Status Header Banner */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.statusLabel}>Current Request Status</Text>
              <Text style={styles.statusTitle}>
                {request.status.toUpperCase().replace(/_/g, " ")}
              </Text>
            </View>
            <RequestStatusBadge status={request.status} />
          </View>
        </Card>

        {/* Worker Summary Card */}
        <Card style={styles.workerCard}>
          <Text style={styles.cardSectionTitle}>Assigned Professional</Text>
          <Divider spacing={Spacing.xs} />
          <Pressable
            style={styles.workerHeaderRow}
            onPress={() => {
              if (request.worker_profile_id) {
                router.push(`/(customer)/worker/${request.worker_profile_id}` as any);
              }
            }}
          >
            <Avatar name={workerName} size={52} backgroundColor={Colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.workerName}>{workerName}</Text>
              <Text style={styles.workerTrade}>{workerTrade}</Text>
              {worker?.city ? (
                <Text style={styles.workerLocation}>
                  📍 {worker.city}, {worker.state}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Card>

        {/* Request Details Card */}
        <Card style={styles.detailCard}>
          <Text style={styles.cardSectionTitle}>Service Information</Text>
          <Divider spacing={Spacing.xs} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Job Title</Text>
            <Text style={styles.infoValue}>{request.title}</Text>
          </View>

          {request.description ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{request.description}</Text>
            </View>
          ) : null}

          {request.service_location ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Service Location</Text>
              <Text style={styles.infoValue}>📍 {request.service_location}</Text>
            </View>
          ) : null}

          {dateStr ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Preferred Date / Time</Text>
              <Text style={styles.infoValue}>🗓️ {dateStr}</Text>
            </View>
          ) : null}

          {request.agreed_price ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Agreed Price</Text>
              <Text style={styles.priceValue}>₹{request.agreed_price}</Text>
            </View>
          ) : null}
        </Card>

        {/* Worker Completion Notes (if available) */}
        {(request.worker_notes || request.photo_url) && (
          <Card style={styles.completionNotesCard}>
            <Text style={styles.cardSectionTitle}>Worker Completion Notes</Text>
            <Divider spacing={Spacing.xs} />
            {request.worker_notes ? (
              <Text style={styles.notesText}>{request.worker_notes}</Text>
            ) : null}
            {request.photo_url ? (
              <View style={styles.photoContainer}>
                <Text style={styles.photoLabel}>Attached Proof of Work:</Text>
                <Text style={styles.photoUrlText}>{request.photo_url}</Text>
              </View>
            ) : null}
          </Card>
        )}

        {/* Customer Notes (if available) */}
        {request.customer_notes && (
          <Card style={styles.detailCard}>
            <Text style={styles.cardSectionTitle}>Your Confirmation Notes</Text>
            <Divider spacing={Spacing.xs} />
            <Text style={styles.notesText}>{request.customer_notes}</Text>
          </Card>
        )}

        {/* Actions based on status */}

        {/* 1. Status = requested -> Cancel Request */}
        {request.status === "requested" && (
          <Card style={styles.actionCard}>
            <Text style={styles.actionTitle}>Manage Request</Text>
            <Text style={styles.actionDesc}>
              The worker has not accepted this request yet. You can cancel it at any time.
            </Text>
            <Button
              label="Cancel Request"
              variant="danger"
              size="md"
              loading={cancelling}
              onPress={() => setShowCancelDialog(true)}
              accessibilityLabel="Cancel this service request"
            />
          </Card>
        )}

        {/* 2. Status = completion_pending -> Confirm Completion */}
        {request.status === "completion_pending" && (
          <Card style={styles.actionCardHighlight}>
            <Text style={styles.highlightTitle}>Worker Marked As Completed</Text>
            <Text style={styles.highlightDesc}>
              The worker has finished the service and submitted completion details. Please review
              and confirm completion.
            </Text>

            {!showConfirmModal ? (
              <Button
                label="Confirm Completion"
                variant="primary"
                size="lg"
                onPress={() => setShowConfirmModal(true)}
                accessibilityLabel="Confirm service completion"
              />
            ) : (
              <View style={styles.confirmForm}>
                <TextInput
                  label="Customer Feedback / Notes (Optional)"
                  placeholder="Share any feedback or confirmation details…"
                  value={customerNotes}
                  onChangeText={setCustomerNotes}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.confirmBtnRow}>
                  <Button
                    label="Back"
                    variant="outline"
                    size="md"
                    onPress={() => setShowConfirmModal(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Yes, Confirm"
                    variant="primary"
                    size="md"
                    loading={confirming}
                    onPress={handleConfirmCompletion}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </Card>
        )}

        {/* 3. Status = completed -> Reviews */}
        {request.status === "completed" && (
          <Card style={styles.detailCard}>
            <Text style={styles.cardSectionTitle}>Service Review</Text>
            <Divider spacing={Spacing.xs} />

            {reviewSuccess && (
              <View style={styles.reviewSuccessBanner}>
                <Text style={styles.reviewSuccessText}>
                  ✓ Thank you! Your review has been published.
                </Text>
              </View>
            )}

            {hasReview ? (
              <View style={styles.existingReviewBox}>
                <View style={styles.reviewHeaderRow}>
                  <Text style={styles.starsText}>
                    {"★".repeat(existingReview.rating)}
                  </Text>
                  <Text style={styles.reviewDateText}>
                    {existingReview.created_at
                      ? new Date(existingReview.created_at).toLocaleDateString()
                      : ""}
                  </Text>
                </View>
                {existingReview.comment ? (
                  <Text style={styles.existingCommentText}>
                    “{existingReview.comment}”
                  </Text>
                ) : null}
              </View>
            ) : !showReviewForm ? (
              <View style={styles.writeReviewPrompt}>
                <Text style={styles.writeReviewDesc}>
                  How was your experience with {workerName}? Share a review to help other customers.
                </Text>
                <Button
                  label="Write a Review"
                  variant="primary"
                  size="md"
                  onPress={() => setShowReviewForm(true)}
                  accessibilityLabel="Write a review for this completed job"
                />
              </View>
            ) : (
              <View style={styles.reviewFormContainer}>
                <Text style={styles.ratingPromptText}>Select Rating:</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      <Text
                        style={[
                          styles.starIcon,
                          { color: star <= rating ? Colors.warning : Colors.border },
                        ]}
                      >
                        ★
                      </Text>
                    </Pressable>
                  ))}
                  <Text style={styles.selectedRatingText}>{rating} / 5</Text>
                </View>

                {postReviewError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>⚠️ {postReviewError}</Text>
                  </View>
                ) : null}

                <TextInput
                  label="Your Comment (Optional)"
                  placeholder="Share details about the quality of work, punctuality, and professionalism…"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.reviewActionRow}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="md"
                    onPress={() => setShowReviewForm(false)}
                  />
                  <Button
                    label={postingReview ? "Submitting…" : "Submit Review"}
                    variant="primary"
                    size="md"
                    loading={postingReview}
                    onPress={handleSubmitReview}
                  />
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Confirmation Dialog for Cancel */}
      <ConfirmDialog
        visible={showCancelDialog}
        title="Cancel Service Request?"
        message="Are you sure you want to cancel this request? This action cannot be undone."
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        destructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
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
    paddingBottom: Spacing["4xl"],
  },
  statusCard: {
    backgroundColor: Colors.backgroundCard,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  workerCard: {
    gap: Spacing.sm,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  workerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  workerTrade: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  workerLocation: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
    paddingRight: Spacing.xs,
  },
  detailCard: {
    gap: Spacing.md,
  },
  infoBlock: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.teal,
  },
  completionNotesCard: {
    backgroundColor: "#F0FDFA",
    borderColor: Colors.teal + "35",
    gap: Spacing.sm,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  photoContainer: {
    marginTop: Spacing.xs,
    gap: 2,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.tealDark,
  },
  photoUrlText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "monospace",
  },
  actionCard: {
    gap: Spacing.sm,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionCardHighlight: {
    backgroundColor: "#FAF5FF",
    borderColor: "#7C3AED40",
    gap: Spacing.sm,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7C3AED",
  },
  highlightDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  confirmForm: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  writeReviewPrompt: {
    gap: Spacing.md,
  },
  writeReviewDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  reviewSuccessBanner: {
    backgroundColor: Colors.successBg,
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  reviewSuccessText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.success,
  },
  existingReviewBox: {
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundMuted,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  starsText: {
    fontSize: 16,
    color: Colors.warning,
  },
  reviewDateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  existingCommentText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    fontStyle: "italic",
  },
  reviewFormContainer: {
    gap: Spacing.md,
  },
  ratingPromptText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  starIcon: {
    fontSize: 32,
  },
  selectedRatingText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  errorBanner: {
    backgroundColor: Colors.errorBg,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "600",
  },
  reviewActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.md,
    alignItems: "center",
  },
});
