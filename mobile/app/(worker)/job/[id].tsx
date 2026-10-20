/**
 * app/(worker)/job/[id].tsx — Worker Job Detail Screen.
 *
 * Full job details, customer info, action buttons (Accept/Decline, Start,
 * Mark as Complete with completion notes and photo), status display, and review display.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Colors } from "../../../constants/colors";
import { Spacing, Radius } from "../../../constants/spacing";
import {
  useServiceRequestDetail,
  useServiceRequestReviews,
  useAcceptRequest,
  useDeclineRequest,
  useStartRequest,
  useWorkerComplete,
} from "../../../hooks/useMarketplace";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Avatar } from "../../../components/ui/Avatar";
import { Divider } from "../../../components/ui/Divider";
import { TextInput } from "../../../components/ui/TextInput";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { RequestStatusBadge } from "../../(customer)/requests";

export default function WorkerJobDetailScreen() {
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

  const { acceptRequest, loading: accepting } = useAcceptRequest();
  const { declineRequest, loading: declining } = useDeclineRequest();
  const { startRequest, loading: starting } = useStartRequest();
  const { workerComplete, loading: completing } = useWorkerComplete();

  const [refreshing, setRefreshing] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [workerNotes, setWorkerNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchRequest(), refetchReviews()]);
    setRefreshing(false);
  }

  async function handleAccept() {
    try {
      await acceptRequest(requestId);
      await refetchRequest();
      Alert.alert("Job Accepted", "You have accepted this job.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept job.");
    }
  }

  async function handleConfirmDecline() {
    try {
      setShowDeclineDialog(false);
      await declineRequest(requestId);
      await refetchRequest();
      Alert.alert("Job Declined", "You have declined this job.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to decline job.");
    }
  }

  async function handleStartWork() {
    try {
      await startRequest(requestId);
      await refetchRequest();
      Alert.alert("Work Started", "You have started work on this job.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start job.");
    }
  }

  async function handleSubmitCompletion() {
    try {
      await workerComplete(requestId, {
        worker_notes: workerNotes.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
      });
      setShowCompleteForm(false);
      await refetchRequest();
      Alert.alert(
        "Completion Submitted",
        "Your completion details have been sent to the customer for confirmation."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit completion.");
    }
  }

  if (requestLoading && !refreshing) {
    return <LoadingState message="Loading job details…" fullScreen />;
  }

  if (requestError && !request) {
    return (
      <ErrorState
        title="Job not found"
        message={requestError}
        onRetry={handleRefresh}
      />
    );
  }

  if (!request) {
    return (
      <ErrorState
        title="Job not found"
        message="This job does not exist or has been removed."
        onRetry={handleRefresh}
      />
    );
  }

  const customerName = request.customer_name || "Customer";
  const dateStr = request.preferred_date
    ? request.preferred_date
    : request.created_at
    ? new Date(request.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const review = reviews[0];

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
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.statusLabel}>Current Job Status</Text>
              <Text style={styles.statusTitle}>
                {request.status.toUpperCase().replace(/_/g, " ")}
              </Text>
            </View>
            <RequestStatusBadge status={request.status} />
          </View>
        </Card>

        {/* Customer Information Card */}
        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Customer Information</Text>
          <Divider spacing={Spacing.xs} />
          <View style={styles.customerRow}>
            <Avatar name={customerName} size={48} backgroundColor={Colors.roleCustomer} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              {request.service_location ? (
                <Text style={styles.locationText}>📍 {request.service_location}</Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Job Details Card */}
        <Card style={styles.card}>
          <Text style={styles.cardSectionTitle}>Job Details</Text>
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

          {dateStr ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Scheduled / Preferred Date</Text>
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

        {/* Completion details if completed or completion_pending */}
        {(request.worker_notes || request.photo_url) && (
          <Card style={styles.completionNotesCard}>
            <Text style={styles.cardSectionTitle}>Your Completion Submission</Text>
            <Divider spacing={Spacing.xs} />
            {request.worker_notes ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Work Notes</Text>
                <Text style={styles.infoValue}>{request.worker_notes}</Text>
              </View>
            ) : null}
            {request.photo_url ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Proof Photo URL</Text>
                <Text style={styles.photoUrlText}>{request.photo_url}</Text>
              </View>
            ) : null}
          </Card>
        )}

        {/* Customer confirmation notes */}
        {request.customer_notes && (
          <Card style={styles.card}>
            <Text style={styles.cardSectionTitle}>Customer Confirmation Notes</Text>
            <Divider spacing={Spacing.xs} />
            <Text style={styles.infoValue}>{request.customer_notes}</Text>
          </Card>
        )}

        {/* Status Actions */}

        {/* 1. Status: requested -> Accept / Decline */}
        {request.status === "requested" && (
          <Card style={styles.actionCard}>
            <Text style={styles.actionTitle}>Respond to Customer</Text>
            <Text style={styles.actionDesc}>
              Review the job details above. You can accept this request to commit or decline if you
              are unavailable.
            </Text>
            <View style={styles.actionBtnRow}>
              <Button
                label="Decline"
                variant="outline"
                size="md"
                loading={declining}
                onPress={() => setShowDeclineDialog(true)}
                style={{ flex: 1 }}
                accessibilityLabel="Decline job request"
              />
              <Button
                label="Accept Job"
                variant="primary"
                size="md"
                loading={accepting}
                onPress={handleAccept}
                style={{ flex: 1 }}
                accessibilityLabel="Accept job request"
              />
            </View>
          </Card>
        )}

        {/* 2. Status: accepted -> Start Work */}
        {request.status === "accepted" && (
          <Card style={styles.actionCard}>
            <Text style={styles.actionTitle}>Ready to begin?</Text>
            <Text style={styles.actionDesc}>
              Once you arrive at the job location or begin the work, tap Start Work to inform the
              customer.
            </Text>
            <Button
              label="Start Work"
              variant="primary"
              size="lg"
              fullWidth
              loading={starting}
              onPress={handleStartWork}
              accessibilityLabel="Start work on this job"
            />
          </Card>
        )}

        {/* 3. Status: in_progress -> Complete Work */}
        {request.status === "in_progress" && (
          <Card style={styles.actionCard}>
            <Text style={styles.actionTitle}>Complete Job</Text>
            <Text style={styles.actionDesc}>
              Finished all repairs or services? Submit your completion notes and proof to notify the
              customer for approval.
            </Text>

            {!showCompleteForm ? (
              <Button
                label="Mark as Complete"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => setShowCompleteForm(true)}
                accessibilityLabel="Mark job as complete"
              />
            ) : (
              <View style={styles.completeForm}>
                <TextInput
                  label="Completion Notes"
                  placeholder="Describe the tasks completed, parts replaced, etc.…"
                  value={workerNotes}
                  onChangeText={setWorkerNotes}
                  multiline
                  numberOfLines={4}
                />
                <TextInput
                  label="Proof Photo URL (Optional)"
                  placeholder="e.g. https://storage.craftrelay.app/evidence/photo1.jpg"
                  value={photoUrl}
                  onChangeText={setPhotoUrl}
                  leftIcon={<Text style={{ fontSize: 14 }}>📷</Text>}
                />
                <View style={styles.actionBtnRow}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="md"
                    onPress={() => setShowCompleteForm(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Submit Completion"
                    variant="primary"
                    size="md"
                    loading={completing}
                    onPress={handleSubmitCompletion}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </Card>
        )}

        {/* 4. Status: completion_pending */}
        {request.status === "completion_pending" && (
          <Card style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>⏳ Awaiting Customer Confirmation</Text>
            <Text style={styles.pendingDesc}>
              You have submitted completion details. The customer has been notified to verify and
              confirm the completed work.
            </Text>
          </Card>
        )}

        {/* 5. Status: completed -> Customer Review */}
        {request.status === "completed" && (
          <Card style={styles.card}>
            <Text style={styles.cardSectionTitle}>Customer Review</Text>
            <Divider spacing={Spacing.xs} />
            {review ? (
              <View style={styles.reviewBox}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.starText}>{"★".repeat(review.rating)}</Text>
                  <Text style={styles.reviewDate}>
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString()
                      : ""}
                  </Text>
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>“{review.comment}”</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.noReviewText}>
                No review has been posted yet by the customer.
              </Text>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Decline Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeclineDialog}
        title="Decline Service Request?"
        message="Are you sure you want to decline this request? The customer will be informed and can choose another professional."
        confirmLabel="Decline"
        cancelLabel="Back"
        destructive
        onConfirm={handleConfirmDecline}
        onCancel={() => setShowDeclineDialog(false)}
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
  card: {
    gap: Spacing.md,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  customerNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
  actionBtnRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  completeForm: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  pendingCard: {
    backgroundColor: "#FEF3C7",
    borderColor: Colors.warning + "40",
    gap: Spacing.xs,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.warning,
  },
  pendingDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  reviewBox: {
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundMuted,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  starText: {
    fontSize: 15,
    color: Colors.warning,
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    fontStyle: "italic",
  },
  noReviewText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
});
