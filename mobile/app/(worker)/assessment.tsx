/**
 * app/(worker)/assessment.tsx — Assessment workspace (Part 5).
 *
 * Shows the deterministic criterion-level states from the backend engine:
 * gaps, pending evidence, practical-verification requirements and
 * ready-for-assessor states, with traceable evidence and approved tasks.
 *
 * No state on this screen is a verified competency. Verification can only be
 * recorded by an authorised assessor.
 */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Divider } from "../../components/ui/Divider";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useQualifications } from "../../hooks/useQualifications";
import {
  type AssessmentWorkspace,
  type CriterionState,
  type CriterionStatus,
  useAssessmentCases,
  useAssessmentWorkspace,
  useCreateMapping,
  useMappingSuggestions,
  useOpenAssessmentCase,
  useSubmitAssessmentCase,
} from "../../hooks/useAssessments";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "primary" | "teal";

const STATUS_META: Record<CriterionStatus, { label: string; variant: BadgeVariant }> = {
  GAP: { label: "Evidence gap", variant: "error" },
  PENDING_REVIEW: { label: "Pending review", variant: "warning" },
  ADDITIONAL_EVIDENCE_REQUIRED: {
    label: "More evidence needed",
    variant: "warning",
  },
  PRACTICAL_VERIFICATION_REQUIRED: {
    label: "Practical check needed",
    variant: "info",
  },
  READY_FOR_ASSESSOR_DECISION: {
    label: "Ready for assessor",
    variant: "teal",
  },
  VERIFIED: { label: "Verified", variant: "success" },
};

const READINESS_LABEL: Record<string, string> = {
  NO_CRITERIA: "No criteria configured",
  MANDATORY_GAPS_REMAIN: "Mandatory gaps remain",
  GAPS_REMAIN: "Some gaps remain",
  READY_FOR_ASSESSOR_DECISION: "All criteria ready for an assessor decision",
};

export default function AssessmentScreen() {
  const { qualifications, loading: qualificationsLoading } = useQualifications();
  const { cases, loading: casesLoading, refetch: refetchCases } = useAssessmentCases();

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedQualificationId, setSelectedQualificationId] = useState<string | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const activeCaseId = selectedCaseId ?? cases[0]?.id ?? null;
  const activeQualificationId =
    selectedQualificationId ?? cases[0]?.qualification_id ?? null;

  const {
    workspace,
    loading: workspaceLoading,
    error: workspaceError,
    refetch: refetchWorkspace,
    setWorkspace,
  } = useAssessmentWorkspace(activeCaseId);

  const { openCase, opening, error: openError } = useOpenAssessmentCase();
  const { submit, submitting, error: submitError } = useSubmitAssessmentCase(
    activeCaseId ?? ""
  );
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
    load: loadSuggestions,
  } = useMappingSuggestions(activeCaseId ?? "");
  const { link, linking, error: mappingError } = useCreateMapping(
    activeCaseId ?? ""
  );

  const [refreshing, setRefreshing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const qualificationsById = useMemo(
    () => new Map(qualifications.map((q) => [q.id, q])),
    [qualifications]
  );

  async function handleSelectQualification(qualificationId: string) {
    setActionError(null);
    setShowSuggestions(false);
    try {
      const opened = await openCase(qualificationId);
      setSelectedQualificationId(qualificationId);
      setSelectedCaseId(opened.id);
      setWorkspace(opened);
      await refetchCases();
    } catch {
      // openError is rendered below
    }
  }

  async function handleSubmit() {
    setActionError(null);
    try {
      const updated = await submit();
      setWorkspace(updated);
      await refetchCases();
    } catch {
      // submitError is rendered below
    }
  }

  async function handleToggleSuggestions() {
    setActionError(null);
    if (showSuggestions) {
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    await loadSuggestions();
  }

  async function handleLink(criterionId: string, evidenceItemId: string) {
    setActionError(null);
    try {
      await link(criterionId, evidenceItemId, "suggested");
      await refetchWorkspace();
      await loadSuggestions();
      await refetchCases();
    } catch {
      // mappingError is rendered below
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchCases(), refetchWorkspace()]);
    if (showSuggestions) await loadSuggestions();
    setRefreshing(false);
  }

  const combinedError =
    actionError ?? openError ?? submitError ?? mappingError ?? null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Card style={styles.introCard}>
        <Text style={styles.introTitle}>Skill assessment workspace</Text>
        <Text style={styles.introText}>
          Choose a qualification to open an assessment case. The engine maps your
          evidence to criterion-level states and recommends approved practical
          tasks. Only an authorised assessor can verify a competency.
        </Text>
      </Card>

      {/* Qualification picker */}
      <Text style={styles.sectionLabel}>Qualification</Text>
      {qualificationsLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {qualifications.map((qualification) => {
            const active = qualification.id === activeQualificationId;
            return (
              <Pressable
                key={qualification.id}
                onPress={() => handleSelectQualification(qualification.id)}
                disabled={opening}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: opening }}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {qualification.code}
                </Text>
                <Text style={[styles.chipSub, active && styles.chipSubActive]}>
                  {qualification.trade}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {opening ? (
        <Text style={styles.hintText}>Opening assessment case…</Text>
      ) : null}

      {combinedError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{combinedError}</Text>
        </View>
      ) : null}

      {casesLoading && !workspace ? (
        <LoadingState message="Loading assessment cases…" />
      ) : null}

      {!casesLoading && !workspaceLoading && !workspace ? (
        <EmptyState
          icon="🧪"
          title="No assessment case yet"
          description="Select a qualification above to open a case and see criterion-level evidence states."
        />
      ) : null}

      {workspaceLoading && !workspace ? (
        <LoadingState message="Evaluating criteria…" />
      ) : null}

      {workspaceError && !workspace ? (
        <ErrorState
          title="Assessment unavailable"
          message={workspaceError}
          onRetry={refetchWorkspace}
        />
      ) : null}

      {workspace ? (
        <WorkspaceView
          workspace={workspace}
          qualificationTitle={
            qualificationsById.get(workspace.qualification_id)?.title ??
            workspace.qualification_title
          }
          showSuggestions={showSuggestions}
          suggestionsLoading={suggestionsLoading}
          suggestionsError={suggestionsError}
          suggestions={suggestions}
          linking={linking}
          onToggleSuggestions={handleToggleSuggestions}
          onLink={handleLink}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : null}
    </ScrollView>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────

interface WorkspaceViewProps {
  workspace: AssessmentWorkspace;
  qualificationTitle: string;
  showSuggestions: boolean;
  suggestionsLoading: boolean;
  suggestionsError: string | null;
  suggestions: ReturnType<typeof useMappingSuggestions>["suggestions"];
  linking: string | null;
  onToggleSuggestions: () => void;
  onLink: (criterionId: string, evidenceItemId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function WorkspaceView({
  workspace,
  qualificationTitle,
  showSuggestions,
  suggestionsLoading,
  suggestionsError,
  suggestions,
  linking,
  onToggleSuggestions,
  onLink,
  onSubmit,
  submitting,
}: WorkspaceViewProps) {
  const statusCounts = workspace.status_counts ?? {};
  const allReady = workspace.unresolved_criterion_codes.length === 0;
  const canSubmit = workspace.status === "draft";

  return (
    <View style={styles.workspace}>
      <Card>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.qualTitle}>{qualificationTitle}</Text>
            <Text style={styles.qualMeta}>
              {workspace.qualification_code} · version{" "}
              {workspace.qualification_version_number}
            </Text>
          </View>
          <Badge
            label={workspace.status.toUpperCase()}
            variant={workspace.status === "draft" ? "default" : "primary"}
            size="sm"
          />
        </View>

        <View style={styles.badgeRow}>
          <Badge
            label={READINESS_LABEL[workspace.readiness] ?? workspace.readiness}
            variant={allReady ? "success" : "warning"}
            size="sm"
          />
          {workspace.mandatory_blocker_count > 0 ? (
            <Badge
              label={`${workspace.mandatory_blocker_count} mandatory gap${
                workspace.mandatory_blocker_count === 1 ? "" : "s"
              }`}
              variant="error"
              size="sm"
            />
          ) : null}
        </View>

        <Divider />

        <View style={styles.metricRow}>
          <Metric label="Criteria" value={workspace.criteria.length} />
          <Metric
            label="Ready"
            value={statusCounts.READY_FOR_ASSESSOR_DECISION ?? 0}
          />
          <Metric label="Gaps" value={statusCounts.GAP ?? 0} />
          <Metric
            label="Pending"
            value={statusCounts.PENDING_REVIEW ?? 0}
          />
        </View>

        {workspace.is_illustrative ? (
          <Text style={styles.disclaimer}>
            Illustrative qualification criteria for demonstration — not official
            government or awarding-body standards.
          </Text>
        ) : null}

        {workspace.mandatory_blocker_codes.length > 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Mandatory criteria still open</Text>
            <Text style={styles.warningText}>
              {workspace.mandatory_blocker_codes.join(", ")}
            </Text>
          </View>
        ) : null}

        {workspace.missing_snapshot_codes.length > 0 ? (
          <Text style={styles.disclaimer}>
            Criteria missing from the pinned version:{" "}
            {workspace.missing_snapshot_codes.join(", ")}
          </Text>
        ) : null}
      </Card>

      {/* Criteria */}
      <Text style={styles.sectionLabel}>Criterion states</Text>
      {workspace.criteria.map((criterion) => (
        <CriterionCard key={criterion.criterion_id} criterion={criterion} />
      ))}

      {/* Evidence-mapping suggestions */}
      <Card>
        <Text style={styles.cardTitle}>Evidence links</Text>
        <Text style={styles.cardText}>
          Deterministic keyword matching suggests which evidence may support
          which criterion. Match scores are ranking signals, not probabilities of
          competence.
        </Text>
        <Button
          label={showSuggestions ? "Hide suggestions" : "Suggest evidence links"}
          variant="outline"
          loading={suggestionsLoading}
          onPress={onToggleSuggestions}
          style={styles.cardAction}
        />
        {suggestionsError ? (
          <Text style={styles.errorText}>{suggestionsError}</Text>
        ) : null}
        {showSuggestions && !suggestionsLoading && suggestions.length === 0 ? (
          <Text style={styles.hintText}>
            No lexical matches found. Submit more descriptive evidence or link
            evidence manually from the submission screen.
          </Text>
        ) : null}
        {showSuggestions
          ? suggestions.map((suggestion) => (
              <View
                key={`${suggestion.criterion_id}-${suggestion.evidence_item_id}`}
                style={styles.suggestion}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionCriterion}>
                    {suggestion.criterion_code}
                  </Text>
                  <Badge
                    label={`match ${suggestion.match_score.toFixed(2)}`}
                    variant="info"
                    size="sm"
                  />
                </View>
                <Text style={styles.suggestionEvidence} numberOfLines={2}>
                  {suggestion.evidence_title}
                </Text>
                <Text style={styles.suggestionText} numberOfLines={3}>
                  {suggestion.match_explanation}
                </Text>
                <Text style={styles.suggestionNote}>
                  Requires assessor review
                </Text>
                <Button
                  label={
                    suggestion.already_mapped ? "Already linked" : "Link evidence"
                  }
                  size="sm"
                  variant={suggestion.already_mapped ? "ghost" : "secondary"}
                  disabled={suggestion.already_mapped}
                  loading={linking === suggestion.criterion_id}
                  onPress={() =>
                    onLink(suggestion.criterion_id, suggestion.evidence_item_id)
                  }
                  style={styles.suggestionButton}
                />
              </View>
            ))
          : null}
      </Card>

      {/* Recommendations */}
      <Text style={styles.sectionLabel}>Recommended practical tasks</Text>
      {workspace.recommendations.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>
            {allReady
              ? "Every criterion is ready for an assessor decision, so no further practical task is recommended."
              : "No approved practical task is linked to the remaining unresolved criteria."}
          </Text>
        </Card>
      ) : (
        workspace.recommendations.map((recommendation) => (
          <Card key={recommendation.task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskCode}>{recommendation.task.code}</Text>
              <Badge label="Approved task" variant="teal" size="sm" />
            </View>
            <Text style={styles.taskTitle}>{recommendation.task.title}</Text>
            {recommendation.task.description ? (
              <Text style={styles.cardText}>{recommendation.task.description}</Text>
            ) : null}
            <Text style={styles.reasonText}>{recommendation.reason}</Text>
            <View style={styles.taskMetaRow}>
              <Text style={styles.taskMeta}>
                Rubric {recommendation.task.rubric_reference}
              </Text>
              <Text style={styles.taskMeta}>
                Pass {recommendation.task.pass_score}/{recommendation.task.max_score}
              </Text>
              {recommendation.task.estimated_duration_minutes ? (
                <Text style={styles.taskMeta}>
                  {recommendation.task.estimated_duration_minutes} min
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}

      {/* Submit */}
      <Card style={styles.submitCard}>
        <Text style={styles.cardTitle}>Ready to submit?</Text>
        <Text style={styles.cardText}>
          Submitting sends the case for assessor review. You can keep adding
          evidence while the case is in review.
        </Text>
        {canSubmit ? (
          <Button
            label="Submit for assessor review"
            onPress={onSubmit}
            loading={submitting}
            fullWidth
            style={styles.cardAction}
          />
        ) : (
          <Badge
            label={
              workspace.status === "submitted"
                ? "Submitted — awaiting assessor"
                : `Case ${workspace.status}`
            }
            variant="primary"
            style={styles.cardAction}
          />
        )}
      </Card>

      <Text style={styles.footerNote}>{workspace.disclaimer}</Text>
    </View>
  );
}

// ── Criterion card ───────────────────────────────────────────────────────────

function CriterionCard({ criterion }: { criterion: CriterionState }) {
  const meta = STATUS_META[criterion.status] ?? {
    label: criterion.status,
    variant: "default" as BadgeVariant,
  };

  return (
    <Card style={styles.criterionCard}>
      <View style={styles.criterionHeader}>
        <Text style={styles.criterionCode}>{criterion.code}</Text>
        <Badge label={meta.label} variant={meta.variant} size="sm" />
      </View>
      {criterion.is_mandatory ? (
        <Text style={styles.mandatoryLabel}>Mandatory criterion</Text>
      ) : null}
      <Text style={styles.criterionDescription}>{criterion.description}</Text>
      {criterion.guidance ? (
        <Text style={styles.criterionGuidance}>{criterion.guidance}</Text>
      ) : null}
      <Text style={styles.criterionExplanation}>{criterion.explanation}</Text>

      {criterion.evidence.length > 0 ? (
        <View style={styles.evidenceList}>
          {criterion.evidence.map((evidence) => (
            <View key={evidence.id} style={styles.evidenceRow}>
              <Text style={styles.evidenceTitle} numberOfLines={1}>
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
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hintText}>No evidence linked yet.</Text>
      )}

      {criterion.linked_tasks.length > 0 ? (
        <Text style={styles.criterionMeta}>
          Practical task:{" "}
          {criterion.linked_tasks.map((task) => task.code).join(", ")}
          {criterion.passed_task_codes.length > 0
            ? ` · passed: ${criterion.passed_task_codes.join(", ")}`
            : " · not passed"}
        </Text>
      ) : null}

      {criterion.conflicts.map((conflict) => (
        <Text key={conflict} style={styles.conflictText}>
          ⚠ {conflict}
        </Text>
      ))}

      <Text style={styles.reviewNote}>
        Assessor decision required — evidence states never verify a competency.
      </Text>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.base,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.md,
  },
  introCard: {
    backgroundColor: Colors.backgroundDark,
    borderColor: Colors.backgroundDark,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  introText: {
    fontSize: 13,
    lineHeight: 21,                    // 13 × 1.6 body-leading
    color: Colors.textInverseSecondary, // --dp-color-on-field-secondary: #d0d4dd
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  inlineLoader: {
    alignSelf: "flex-start",
    marginVertical: Spacing.sm,
  },
  chipRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    minWidth: 120,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  chipLabelActive: {
    color: Colors.textInverse,
  },
  chipSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chipSubActive: {
    color: Colors.textInverseSecondary,   // --dp-color-on-field-secondary: #d0d4dd
  },
  errorBanner: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
  },
  workspace: {
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  titleText: {
    flex: 1,
  },
  qualTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  qualMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  metric: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  warningBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.warning,
  },
  warningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  cardAction: {
    marginTop: Spacing.md,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  suggestion: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestionCriterion: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  suggestionEvidence: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  suggestionText: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  suggestionNote: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "600",
  },
  suggestionButton: {
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  criterionCard: {
    gap: Spacing.xs,
  },
  criterionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  criterionCode: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  mandatoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: Colors.warning,
  },
  criterionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  criterionGuidance: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  criterionExplanation: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  evidenceList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  evidenceTitle: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  criterionMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  conflictText: {
    fontSize: 11,
    color: Colors.warning,
    marginTop: Spacing.xs,
  },
  reviewNote: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  taskCard: {
    gap: Spacing.xs,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskCode: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.tealDark,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  reasonText: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  taskMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  taskMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  submitCard: {
    marginTop: Spacing.sm,
  },
  footerNote: {
    fontSize: 10,
    lineHeight: 15,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
