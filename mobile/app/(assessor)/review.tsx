/**
 * app/(assessor)/review.tsx — Assessor review screen.
 *
 * Shows worker details, all evidence, per-criterion scoring,
 * and approve/reject decision flow.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_ASSESSMENTS } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { EvidenceCard } from "../../components/shared/EvidenceCard";
import { CriterionCard } from "../../components/shared/CriterionCard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { TextInput } from "../../components/ui/TextInput";
import { StatusIndicator } from "../../components/shared/StatusIndicator";

// Use the first in-progress assessment for the review demo
const DEMO_ASSESSMENT = MOCK_ASSESSMENTS[0]!;

export default function AssessorReviewScreen() {
  const [notes, setNotes] = useState(DEMO_ASSESSMENT.assessorNotes);
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      DEMO_ASSESSMENT.criterionScores.map((cs) => [cs.criterionId, String(cs.score)])
    )
  );
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const worker = DEMO_ASSESSMENT.worker;
  const qual = DEMO_ASSESSMENT.qualification;

  function handleApprove() {
    setDecision("approved");
    setSubmitted(true);
    setShowApproveDialog(false);
  }

  function handleReject() {
    setDecision("rejected");
    setSubmitted(true);
    setShowRejectDialog(false);
  }

  if (submitted) {
    return (
      <View style={styles.decisionContainer}>
        <Text style={styles.decisionIcon}>{decision === "approved" ? "✅" : "❌"}</Text>
        <Text style={styles.decisionTitle}>
          Assessment {decision === "approved" ? "Approved" : "Rejected"}
        </Text>
        <Text style={styles.decisionMessage}>
          {decision === "approved"
            ? `${worker.user.name} has been approved for ${qual.title}. They will be notified of the outcome.`
            : `${worker.user.name}'s assessment for ${qual.title} has been marked as rejected. Your notes have been saved.`}
        </Text>
        <StatusIndicator status={decision === "approved" ? "approved" : "rejected"} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Worker summary */}
        <Card style={styles.workerCard}>
          <View style={styles.workerRow}>
            <Avatar name={worker.user.name} size={56} />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{worker.user.name}</Text>
              <Text style={styles.workerLocation}>
                📍 {worker.city}, {worker.state}
              </Text>
              <Text style={styles.workerContact}>{worker.user.email}</Text>
            </View>
            <StatusIndicator status={DEMO_ASSESSMENT.status} />
          </View>
          <Divider />
          <View style={styles.qualHeader}>
            <View>
              <Text style={styles.qualTitle}>{qual.title}</Text>
              <Text style={styles.qualMeta}>
                {qual.skill.name} · {qual.level} · Issued by {qual.issuedBy}
              </Text>
            </View>
            <Badge label={DEMO_ASSESSMENT.type === "evidence_review" ? "Evidence Review" : "Practical"} variant="primary" />
          </View>
        </Card>

        {/* Evidence */}
        {DEMO_ASSESSMENT.evidence.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submitted Evidence</Text>
            {DEMO_ASSESSMENT.evidence.map((e) => (
              <EvidenceCard key={e.id} evidence={e} />
            ))}
          </View>
        ) : (
          <Card style={styles.noEvidenceCard}>
            <Text style={styles.noEvidenceText}>📭 No evidence has been submitted yet.</Text>
          </Card>
        )}

        {/* Scoring */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Criterion Scores</Text>
          {qual.criteria.map((c) => {
            const scored = DEMO_ASSESSMENT.criterionScores.find((cs) => cs.criterionId === c.id);
            return (
              <View key={c.id} style={styles.scoringBlock}>
                <CriterionCard criterion={c} />
                <View style={styles.scoreInputRow}>
                  <Text style={styles.scoreInputLabel}>Score (max {c.weightage})</Text>
                  <TextInput
                    value={scores[c.id] ?? ""}
                    onChangeText={(v) => setScores((prev) => ({ ...prev, [c.id]: v }))}
                    keyboardType="numeric"
                    containerStyle={styles.scoreInput}
                    placeholder="0"
                  />
                </View>
                {scored?.note ? (
                  <Text style={styles.scoreNote}>Note: {scored.note}</Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Assessor notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessor Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder="Add notes about this assessment…"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Reject"
            variant="danger"
            size="lg"
            onPress={() => setShowRejectDialog(true)}
            style={{ flex: 1 }}
          />
          <Button
            label="Approve"
            variant="primary"
            size="lg"
            onPress={() => setShowApproveDialog(true)}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showApproveDialog}
        title="Approve Assessment?"
        message={`Are you sure you want to approve ${worker.user.name} for ${qual.title}? This action will issue a verification badge to the worker.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveDialog(false)}
      />

      <ConfirmDialog
        visible={showRejectDialog}
        title="Reject Assessment?"
        message={`Are you sure you want to reject this assessment? The worker will be notified and may resubmit evidence.`}
        confirmLabel="Reject"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleReject}
        onCancel={() => setShowRejectDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing["4xl"] },
  workerCard: { gap: Spacing.md },
  workerRow: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  workerInfo: { flex: 1, gap: 2 },
  workerName: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  workerLocation: { fontSize: 12, color: Colors.textSecondary },
  workerContact: { fontSize: 12, color: Colors.textMuted },
  qualHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: Spacing.sm },
  qualTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  qualMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  noEvidenceCard: {
    backgroundColor: Colors.backgroundMuted,
    alignItems: "center",
  },
  noEvidenceText: { fontSize: 14, color: Colors.textMuted },
  scoringBlock: { gap: Spacing.sm },
  scoreInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xs,
  },
  scoreInputLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  scoreInput: { width: 80 },
  scoreNote: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic", paddingHorizontal: Spacing.xs },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  decisionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.base,
  },
  decisionIcon: { fontSize: 56 },
  decisionTitle: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary },
  decisionMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
});
