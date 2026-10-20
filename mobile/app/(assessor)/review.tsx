/**
 * app/(assessor)/review.tsx — Criterion-level assessor review (real API).
 *
 * The assessor can:
 * • accept or reject individual evidence items
 * • record practical-task results (pass/fail computed by the backend)
 * • record a formal decision per criterion with a rationale
 * • issue the final qualification decision when every mandatory criterion is
 *   approved — which is the only path that creates a verification.
 */

import React, { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Divider } from "../../components/ui/Divider";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { TextInput } from "../../components/ui/TextInput";
import {
  useAssessmentWorkspace,
  useReviewMapping,
  type AssessmentWorkspace,
  type CriterionState,
  type CriterionStatus,
} from "../../hooks/useAssessments";
import {
  useCriterionDecision,
  useFinalDecision,
  useReviewEvidence,
  useTaskResult,
} from "../../hooks/useAssessorWorkflow";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "primary" | "teal";

const STATUS_META: Record<CriterionStatus, { label: string; variant: BadgeVariant }> = {
  GAP: { label: "Gap", variant: "error" },
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  ADDITIONAL_EVIDENCE_REQUIRED: { label: "More evidence", variant: "warning" },
  PRACTICAL_VERIFICATION_REQUIRED: { label: "Practical needed", variant: "info" },
  READY_FOR_ASSESSOR_DECISION: { label: "Ready", variant: "teal" },
  VERIFIED: { label: "Verified", variant: "success" },
};

const DECISION_LABEL: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  additional_evidence_required: "Additional evidence requested",
};

export default function AssessorReviewScreen() {
  const params = useLocalSearchParams<{ caseId?: string }>();
  const caseId = typeof params.caseId === "string" ? params.caseId : null;
  const { workspace, loading, error, refetch } =
    useAssessmentWorkspace(caseId);

  const { review, reviewing, error: reviewError } = useReviewEvidence();
  const {
    reviewMapping,
    reviewingMapping,
    error: mappingError,
  } = useReviewMapping(caseId ?? "");
  const { decide, submitting: decisionSubmitting, error: decisionError } =
    useCriterionDecision(caseId ?? "");
  const { record, submitting: taskSubmitting, error: taskError } = useTaskResult(
    caseId ?? ""
  );
  const { decide: finalDecide, submitting: finalSubmitting, error: finalError } =
    useFinalDecision(caseId ?? "");

  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [taskScores, setTaskScores] = useState<Record<string, string>>({});
  const [finalRationale, setFinalRationale] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const combinedError =
    localError ??
    reviewError ??
    mappingError ??
    decisionError ??
    taskError ??
    finalError;

  const finished = useMemo(
    () => workspace?.status === "approved" || workspace?.status === "rejected",
    [workspace]
  );

  if (!caseId) {
    return (
      <EmptyState
        icon="📋"
        title="No case selected"
        description="Open a case from the assessment queue to review it."
      />
    );
  }

  if (loading && !workspace) {
    return <LoadingState message="Loading assessment case…" fullScreen />;
  }

  if (error && !workspace) {
    return <ErrorState title="Case unavailable" message={error} onRetry={refetch} />;
  }

  if (!workspace) {
    return (
      <EmptyState
        icon="🔍"
        title="Case not found"
        description="The assessment case could not be loaded."
      />
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleEvidence(
    evidenceId: string,
    status: "accepted" | "rejected"
  ) {
    setLocalError(null);
    try {
      await review(
        evidenceId,
        status,
        status === "accepted"
          ? "Accepted against the rubric."
          : "Rejected: evidence does not demonstrate the criterion."
      );
      await refetch();
    } catch {
      // hook error displayed above
    }
  }

  async function handleMappingReview(
    mappingId: string,
    decision: "confirmed" | "rejected"
  ) {
    setLocalError(null);
    try {
      await reviewMapping(mappingId, decision);
      await refetch();
    } catch {
      // hook error displayed above
    }
  }

  async function handleDecision(
    criterion: CriterionState,
    decision: "approved" | "rejected" | "additional_evidence_required"
  ) {
    setLocalError(null);
    const rationale = (rationales[criterion.criterion_id] ?? "").trim();
    if (rationale.length < 10) {
      setLocalError("Please enter a rationale of at least 10 characters.");
      return;
    }
    try {
      await decide({
        criterionId: criterion.criterion_id,
        decision,
        rationale,
        rubricResult:
          decision === "approved"
            ? "pass"
            : decision === "rejected"
            ? "fail"
            : "not_applicable",
      });
      setRationales((prev) => ({ ...prev, [criterion.criterion_id]: "" }));
      await refetch();
    } catch {
      // hook error displayed above
    }
  }

  async function handleTaskResult(taskId: string) {
    setLocalError(null);
    const raw = taskScores[taskId];
    const score = Number(raw);
    if (!raw || Number.isNaN(score) || score < 0) {
      setLocalError("Enter a valid practical-task score.");
      return;
    }
    try {
      await record(taskId, score, "Recorded during assessor review.");
      setTaskScores((prev) => ({ ...prev, [taskId]: "" }));
      await refetch();
    } catch {
      // hook error displayed above
    }
  }

  async function handleFinal(outcome: "approved" | "rejected") {
    setLocalError(null);
    const rationale = finalRationale.trim();
    if (rationale.length < 10) {
      setLocalError("Please enter a final rationale of at least 10 characters.");
      return;
    }
    try {
      await finalDecide(outcome, rationale);
      setShowApprove(false);
      setShowReject(false);
      await refetch();
    } catch {
      setShowApprove(false);
      setShowReject(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <CaseHeader workspace={workspace} />

        {combinedError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{combinedError}</Text>
          </View>
        ) : null}

        {finished ? (
          <Card style={styles.finishedCard}>
            <Text style={styles.finishedTitle}>
              {workspace.status === "approved"
                ? "✅ Qualification verified"
                : "❌ Assessment rejected"}
            </Text>
            {workspace.verification?.certificate_number ? (
              <Text style={styles.finishedText}>
                Certificate {workspace.verification.certificate_number}
              </Text>
            ) : null}
            <Text style={styles.finishedText}>
              This case is closed. Formal decisions are immutable.
            </Text>
          </Card>
        ) : null}

        <Text style={styles.sectionLabel}>Criterion review</Text>
        {workspace.criteria.map((criterion) => (
          <CriterionReviewCard
            key={criterion.criterion_id}
            criterion={criterion}
            rationale={rationales[criterion.criterion_id] ?? ""}
            onRationaleChange={(value) =>
              setRationales((prev) => ({
                ...prev,
                [criterion.criterion_id]: value,
              }))
            }
            onEvidence={handleEvidence}
            onMappingReview={handleMappingReview}
            reviewingMapping={reviewingMapping}
            onDecision={handleDecision}
            reviewing={reviewing}
            decisionSubmitting={decisionSubmitting}
            taskScores={taskScores}
            onTaskScoreChange={(taskId, value) =>
              setTaskScores((prev) => ({ ...prev, [taskId]: value }))
            }
            onTaskResult={handleTaskResult}
            taskSubmitting={taskSubmitting}
            taskResults={workspace.task_results}
            finished={finished}
            expandedEvidence={expandedEvidence}
            onToggleEvidence={(id) =>
              setExpandedEvidence((current) => (current === id ? null : id))
            }
          />
        ))}

        {!finished ? (
          <Card style={styles.finalCard}>
            <Text style={styles.finalTitle}>Final qualification decision</Text>
            <Text style={styles.finalHint}>
              Only mandatory criteria and passed practical tasks count. Optional
              criteria cannot substitute for a missing mandatory one.
            </Text>

            {workspace.approval_blockers.length > 0 ? (
              <View style={styles.blockerBox}>
                <Text style={styles.blockerTitle}>Approval blockers</Text>
                {workspace.approval_blockers.map((blocker) => (
                  <Text key={blocker} style={styles.blockerItem}>
                    • {blocker}
                  </Text>
                ))}
              </View>
            ) : (
              <Badge
                label="All mandatory criteria approved"
                variant="success"
                style={styles.readyBadge}
              />
            )}

            <TextInput
              label="Final rationale"
              value={finalRationale}
              onChangeText={setFinalRationale}
              placeholder="Summarise the basis for the decision…"
              multiline
              numberOfLines={3}
              required
            />

            <Button
              label={
                workspace.can_approve
                  ? "Approve qualification"
                  : "Approve qualification (blocked)"
              }
              onPress={() => setShowApprove(true)}
              disabled={!workspace.can_approve || finalSubmitting}
              fullWidth
              style={styles.finalButton}
            />
            <Button
              label="Reject assessment"
              variant="danger"
              onPress={() => setShowReject(true)}
              disabled={finalSubmitting}
              fullWidth
              style={styles.finalButton}
            />
          </Card>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={showApprove}
        title="Approve qualification?"
        message="This creates a formal verification for the worker. It cannot be undone from this screen."
        confirmLabel="Approve"
        onConfirm={() => handleFinal("approved")}
        onCancel={() => setShowApprove(false)}
      />
      <ConfirmDialog
        visible={showReject}
        title="Reject assessment?"
        message="The case will be closed as rejected. The worker will see the rationale."
        confirmLabel="Reject"
        destructive
        onConfirm={() => handleFinal("rejected")}
        onCancel={() => setShowReject(false)}
      />
    </>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function CaseHeader({ workspace }: { workspace: AssessmentWorkspace }) {
  const completion = workspace.criteria.filter(
    (c) => c.decision?.decision === "approved"
  ).length;
  return (
    <Card style={styles.headerCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.workerName}>{workspace.worker_name ?? "Worker"}</Text>
          <Text style={styles.qualTitle}>{workspace.qualification_title}</Text>
          <Text style={styles.qualMeta}>
            {workspace.qualification_code} · version{" "}
            {workspace.qualification_version_number}
          </Text>
        </View>
        <Badge
          label={workspace.status.replace("_", " ").toUpperCase()}
          variant={
            workspace.status === "approved"
              ? "success"
              : workspace.status === "rejected"
              ? "error"
              : "primary"
          }
          size="sm"
        />
      </View>
      <Divider />
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {completion}/{workspace.criteria.length} criteria approved
        </Text>
        <Text style={styles.progressText}>
          {workspace.mandatory_blocker_count} mandatory gap
          {workspace.mandatory_blocker_count === 1 ? "" : "s"}
        </Text>
      </View>
      {workspace.is_illustrative ? (
        <Text style={styles.disclaimer}>
          Illustrative qualification criteria — not official standards.
        </Text>
      ) : null}
    </Card>
  );
}

// ── Criterion card ───────────────────────────────────────────────────────────

interface CriterionReviewCardProps {
  criterion: CriterionState;
  rationale: string;
  onRationaleChange: (value: string) => void;
  onEvidence: (evidenceId: string, status: "accepted" | "rejected") => void;
  onMappingReview: (
    mappingId: string,
    decision: "confirmed" | "rejected"
  ) => void;
  reviewingMapping: string | null;
  onDecision: (
    criterion: CriterionState,
    decision: "approved" | "rejected" | "additional_evidence_required"
  ) => void;
  reviewing: string | null;
  decisionSubmitting: string | null;
  taskScores: Record<string, string>;
  onTaskScoreChange: (taskId: string, value: string) => void;
  onTaskResult: (taskId: string) => void;
  taskSubmitting: string | null;
  taskResults: AssessmentWorkspace["task_results"];
  finished: boolean;
  expandedEvidence: string | null;
  onToggleEvidence: (evidenceId: string) => void;
}

function CriterionReviewCard({
  criterion,
  rationale,
  onRationaleChange,
  onEvidence,
  onMappingReview,
  reviewingMapping,
  onDecision,
  reviewing,
  decisionSubmitting,
  taskScores,
  onTaskScoreChange,
  onTaskResult,
  taskSubmitting,
  taskResults,
  finished,
  expandedEvidence,
  onToggleEvidence,
}: CriterionReviewCardProps) {
  const meta = STATUS_META[criterion.status] ?? {
    label: criterion.status,
    variant: "default" as BadgeVariant,
  };
  const canApprove = criterion.status === "READY_FOR_ASSESSOR_DECISION";

  return (
    <Card style={styles.criterionCard}>
      <View style={styles.criterionHeader}>
        <Text style={styles.criterionCode}>{criterion.code}</Text>
        <Badge label={meta.label} variant={meta.variant} size="sm" />
      </View>
      {criterion.is_mandatory ? (
        <Text style={styles.mandatory}>MANDATORY</Text>
      ) : null}
      <Text style={styles.description}>{criterion.description}</Text>
      <Text style={styles.explanation}>{criterion.explanation}</Text>

      <Text style={styles.subLabel}>Evidence</Text>
      {criterion.evidence.length === 0 ? (
        <Text style={styles.mutedText}>No evidence linked.</Text>
      ) : (
        criterion.evidence.map((evidence) => (
          <View key={evidence.id} style={styles.evidenceRow}>
            <Pressable
              style={styles.evidenceInfo}
              onPress={() => onToggleEvidence(evidence.id)}
              accessibilityRole="button"
              accessibilityHint="Show evidence details"
            >
              <Text style={styles.evidenceTitle} numberOfLines={2}>
                {evidence.title}
              </Text>
              <Badge
                label={evidence.review_status.replace("_", " ")}
                variant={
                  evidence.review_status === "accepted"
                    ? "success"
                    : evidence.review_status === "rejected"
                    ? "error"
                    : "warning"
                }
                size="sm"
              />
            </Pressable>
            {expandedEvidence === evidence.id ? (
              <View style={styles.evidenceDetail}>
                {evidence.description ? (
                  <Text style={styles.evidenceDescription}>
                    {evidence.description}
                  </Text>
                ) : (
                  <Text style={styles.evidenceMeta}>No description provided.</Text>
                )}
                <Text style={styles.evidenceMeta}>
                  {evidence.evidence_type} · submitted{" "}
                  {new Date(evidence.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {evidence.original_filename
                    ? ` · ${evidence.original_filename}`
                    : ""}
                </Text>
                {evidence.file_url ? (
                  <Text
                    style={styles.evidenceLink}
                    onPress={() =>
                      Linking.openURL(evidence.file_url as string).catch(() => {
                        // Ignore unsupported URL schemes on the device.
                      })
                    }
                  >
                    Open evidence file ↗
                  </Text>
                ) : (
                  <Text style={styles.evidenceMeta}>
                    File stored securely — use the authenticated download endpoint.
                  </Text>
                )}
              </View>
            ) : null}
            <View style={styles.evidenceActions}>
              <Badge
                label={`Link ${evidence.mapping_status}`}
                variant={
                  evidence.mapping_status === "confirmed"
                    ? "success"
                    : evidence.mapping_status === "rejected"
                    ? "error"
                    : "default"
                }
                size="sm"
              />
              {!finished && evidence.mapping_status !== "confirmed" ? (
                <Button
                  label="Confirm link"
                  size="sm"
                  variant="secondary"
                  loading={reviewingMapping === evidence.mapping_id}
                  onPress={() =>
                    onMappingReview(evidence.mapping_id, "confirmed")
                  }
                />
              ) : null}
              {!finished && evidence.mapping_status !== "rejected" ? (
                <Button
                  label="Reject link"
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    onMappingReview(evidence.mapping_id, "rejected")
                  }
                />
              ) : null}
            </View>
            {!finished &&
            (evidence.review_status === "pending" ||
              evidence.review_status === "under_review") ? (
              <View style={styles.evidenceActions}>
                <Button
                  label="Accept"
                  size="sm"
                  variant="secondary"
                  loading={reviewing === evidence.id}
                  onPress={() => onEvidence(evidence.id, "accepted")}
                />
                <Button
                  label="Reject"
                  size="sm"
                  variant="outline"
                  onPress={() => onEvidence(evidence.id, "rejected")}
                />
              </View>
            ) : null}
          </View>
        ))
      )}

      {criterion.linked_tasks.length > 0 ? (
        <>
          <Text style={styles.subLabel}>Practical verification</Text>
          {criterion.linked_tasks.map((task) => {
            const existing = taskResults.find((r) => r.task_id === task.id);
            return (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskCode}>{task.code}</Text>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskMeta}>
                    Rubric {task.rubric_reference ?? "—"} · pass {task.pass_score}/
                    {task.max_score}
                  </Text>
                  {existing ? (
                    <Badge
                      label={`${existing.passed ? "Passed" : "Failed"} · ${existing.score}`}
                      variant={existing.passed ? "success" : "error"}
                      size="sm"
                    />
                  ) : null}
                </View>
                {!finished ? (
                  <View style={styles.scoreBox}>
                    <TextInput
                      value={taskScores[task.id] ?? ""}
                      onChangeText={(value) => onTaskScoreChange(task.id, value)}
                      keyboardType="numeric"
                      placeholder="Score"
                      containerStyle={styles.scoreInput}
                    />
                    <Button
                      label="Save"
                      size="sm"
                      variant="outline"
                      loading={taskSubmitting === task.id}
                      onPress={() => onTaskResult(task.id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}

      {criterion.decision ? (
        <View style={styles.decisionBox}>
          <Text style={styles.decisionTitle}>
            Decision: {DECISION_LABEL[criterion.decision.decision]}
          </Text>
          <Text style={styles.decisionMeta}>
            {criterion.decision.assessor_name ?? "Assessor"} ·{" "}
            {criterion.decision.rubric_result
              ? `rubric ${criterion.decision.rubric_result}`
              : "no rubric result"}
          </Text>
          <Text style={styles.decisionRationale}>
            {criterion.decision.rationale}
          </Text>
        </View>
      ) : !finished ? (
        <>
          <TextInput
            label="Decision rationale"
            value={rationale}
            onChangeText={onRationaleChange}
            placeholder="Explain the decision (min 10 characters)…"
            multiline
            numberOfLines={3}
          />
          <View style={styles.decisionActions}>
            <Button
              label="Approve"
              size="sm"
              onPress={() => onDecision(criterion, "approved")}
              disabled={!canApprove || decisionSubmitting === criterion.criterion_id}
              loading={decisionSubmitting === criterion.criterion_id}
            />
            <Button
              label="Reject"
              size="sm"
              variant="danger"
              onPress={() => onDecision(criterion, "rejected")}
              disabled={decisionSubmitting === criterion.criterion_id}
            />
            <Button
              label="Request evidence"
              size="sm"
              variant="outline"
              onPress={() =>
                onDecision(criterion, "additional_evidence_required")
              }
              disabled={decisionSubmitting === criterion.criterion_id}
            />
          </View>
          {!canApprove ? (
            <Text style={styles.blockedHint}>
              Approval unlocks when evidence is accepted and any linked practical
              task has passed.
            </Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing["4xl"],
  },
  headerCard: { gap: Spacing.sm },
  headerRow: { flexDirection: "row", gap: Spacing.sm },
  headerText: { flex: 1 },
  workerName: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  qualTitle: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary, marginTop: 2 },
  qualMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  progressText: { fontSize: 11, color: Colors.textSecondary },
  disclaimer: { fontSize: 10, color: Colors.textMuted, marginTop: Spacing.xs },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorBanner: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { fontSize: 12, color: Colors.error },
  finishedCard: { backgroundColor: Colors.backgroundMuted },
  finishedTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  finishedText: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.xs },
  criterionCard: { gap: Spacing.sm },
  criterionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  criterionCode: { fontSize: 13, fontWeight: "700", color: Colors.roleAssessor },
  mandatory: { fontSize: 10, fontWeight: "700", color: Colors.warning, letterSpacing: 0.8 },
  description: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  explanation: { fontSize: 11, lineHeight: 16, color: Colors.textSecondary, fontStyle: "italic" },
  subLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: Spacing.xs,
  },
  mutedText: { fontSize: 12, color: Colors.textMuted },
  evidenceRow: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  evidenceInfo: { gap: Spacing.xs },
  evidenceTitle: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  evidenceDetail: { gap: 4, paddingTop: Spacing.xs },
  evidenceDescription: { fontSize: 12, color: Colors.textSecondary },
  evidenceMeta: { fontSize: 10, color: Colors.textMuted },
  evidenceLink: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.roleAssessor,
  },
  evidenceActions: { flexDirection: "row", gap: Spacing.sm },
  taskRow: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  taskInfo: { gap: 2 },
  taskCode: { fontSize: 11, fontWeight: "700", color: Colors.tealDark },
  taskTitle: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  taskMeta: { fontSize: 10, color: Colors.textMuted },
  scoreBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  scoreInput: { flex: 1 },
  decisionBox: {
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  decisionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  decisionMeta: { fontSize: 10, color: Colors.textMuted },
  decisionRationale: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  decisionActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  blockedHint: { fontSize: 10, color: Colors.textMuted },
  finalCard: { gap: Spacing.md, marginTop: Spacing.sm },
  finalTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  finalHint: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  blockerBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  blockerTitle: { fontSize: 12, fontWeight: "700", color: Colors.warning },
  blockerItem: { fontSize: 11, color: Colors.textSecondary },
  readyBadge: { alignSelf: "flex-start" },
  finalButton: { marginTop: Spacing.xs },
});
