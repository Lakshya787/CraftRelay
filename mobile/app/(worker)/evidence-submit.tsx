/**
 * app/(worker)/evidence-submit.tsx — Evidence submission screen.
 *
 * Allows workers to attach evidence (photo/doc/cert/URL) to a specific
 * qualification criterion. No actual file upload — UI only for Part 2.
 * Part 3 will wire up the upload API.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_QUALIFICATIONS, MOCK_EVIDENCE } from "../../data/mockData";
import type { EvidenceType } from "../../types/domain";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Badge } from "../../components/ui/Badge";
import { EvidenceCard } from "../../components/shared/EvidenceCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

const EVIDENCE_TYPE_OPTIONS: Array<{ type: EvidenceType; label: string; icon: string; description: string }> = [
  { type: "photo", label: "Photo", icon: "📷", description: "Photograph of your work" },
  { type: "video", label: "Video", icon: "🎥", description: "Short video demonstration" },
  { type: "certificate", label: "Certificate", icon: "🏅", description: "Training or certification document" },
  { type: "document", label: "Document", icon: "📄", description: "PDF, report, or worksheet" },
  { type: "url", label: "URL", icon: "🔗", description: "Link to external proof" },
];

interface FormState {
  title: string;
  description: string;
  type: EvidenceType;
  url: string;
  criterionId: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  url?: string;
  criterionId?: string;
}

export default function EvidenceSubmitScreen() {
  const { assessmentId } = useLocalSearchParams<{ assessmentId?: string }>();

  // Use first qualification for demo
  const qualification = MOCK_QUALIFICATIONS[0]!;
  const existingEvidence = MOCK_EVIDENCE.filter((e) => e.workerId === "u1");

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    type: "photo",
    url: "",
    criterionId: qualification.criteria[0]?.id ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function update<K extends keyof FormState>(field: K) {
    return (value: FormState[K]) =>
      setForm((f) => ({ ...f, [field]: value }));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.title.trim()) e.title = "Title is required";
    else if (form.title.trim().length < 5) e.title = "Title must be at least 5 characters";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.criterionId) e.criterionId = "Please select a criterion";
    if (form.type === "url" && !form.url.trim()) e.url = "URL is required for URL evidence";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (validate()) setShowConfirm(true);
  }

  function confirmSubmit() {
    setShowConfirm(false);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Evidence Submitted</Text>
        <Text style={styles.successMessage}>
          Your evidence has been submitted for review. An assessor will evaluate
          it and you will be notified of the outcome.
        </Text>
        <Button
          label="Back to Qualifications"
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
        {/* Qualification context */}
        <Card style={styles.contextCard}>
          <Text style={styles.contextLabel}>Submitting for</Text>
          <Text style={styles.contextTitle}>{qualification.title}</Text>
          <Text style={styles.contextSub}>
            {qualification.skill.name} · {qualification.level} · Issued by {qualification.issuedBy}
          </Text>
        </Card>

        {/* Step 1 — Select criterion */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>1. Select Criterion</Text>
          {errors.criterionId ? (
            <Text style={styles.fieldError}>{errors.criterionId}</Text>
          ) : null}
          <View style={styles.criterionList}>
            {qualification.criteria.map((c) => {
              const selected = form.criterionId === c.id;
              const evidenceForCriterion = existingEvidence.filter(
                (e) => e.criterionId === c.id
              );
              return (
                <Pressable
                  key={c.id}
                  style={[styles.criterionBtn, selected && styles.criterionBtnActive]}
                  onPress={() => update("criterionId")(c.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={styles.criterionHeader}>
                    <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.criterionTitle, selected && { color: Colors.primary }]}>
                        {c.title}
                      </Text>
                      <Text style={styles.criterionDesc} numberOfLines={2}>
                        {c.description}
                      </Text>
                    </View>
                    <Badge label={`${c.weightage}%`} variant="default" size="sm" />
                  </View>
                  {evidenceForCriterion.length > 0 ? (
                    <Text style={styles.existingCount}>
                      {evidenceForCriterion.length} piece{evidenceForCriterion.length !== 1 ? "s" : ""} already submitted
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Step 2 — Evidence type */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>2. Evidence Type</Text>
          <View style={styles.typeGrid}>
            {EVIDENCE_TYPE_OPTIONS.map(({ type, label, icon, description }) => {
              const selected = form.type === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.typeBtn, selected && styles.typeBtnActive]}
                  onPress={() => update("type")(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.typeIcon}>{icon}</Text>
                  <Text style={[styles.typeLabel, selected && styles.typeLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.typeDescription}>
            {EVIDENCE_TYPE_OPTIONS.find((o) => o.type === form.type)?.description}
          </Text>
        </View>

        {/* Step 3 — Details */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>3. Evidence Details</Text>
          <TextInput
            label="Title"
            value={form.title}
            onChangeText={update("title")}
            error={errors.title}
            placeholder="e.g. IS 732 Safety Certificate 2024"
            required
          />
          <TextInput
            label="Description"
            value={form.description}
            onChangeText={update("description")}
            error={errors.description}
            placeholder="Briefly describe what this evidence shows…"
            multiline
            numberOfLines={3}
            required
          />
          {form.type === "url" ? (
            <TextInput
              label="URL"
              value={form.url}
              onChangeText={update("url")}
              error={errors.url}
              placeholder="https://…"
              keyboardType="url"
              autoCapitalize="none"
              required
            />
          ) : null}

          {/* File upload placeholder — functional upload in Part 3 */}
          {form.type !== "url" ? (
            <Pressable style={styles.uploadArea}>
              <Text style={styles.uploadIcon}>
                {EVIDENCE_TYPE_OPTIONS.find((o) => o.type === form.type)?.icon}
              </Text>
              <Text style={styles.uploadTitle}>
                Tap to select{" "}
                {form.type === "photo"
                  ? "a photo"
                  : form.type === "video"
                  ? "a video"
                  : "a file"}
              </Text>
              <Text style={styles.uploadHint}>
                File upload will be available in the next update.
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Existing evidence for this worker */}
        {existingEvidence.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.stepLabel}>My Previous Evidence</Text>
            {existingEvidence.slice(0, 3).map((e) => (
              <EvidenceCard key={e.id} evidence={e} />
            ))}
          </View>
        ) : null}

        <Button
          label="Submit Evidence"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title="Submit Evidence?"
        message={`Submit "${form.title}" as ${form.type} evidence? Once submitted, an assessor will be notified to review it.`}
        confirmLabel="Submit"
        cancelLabel="Cancel"
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.xl, paddingBottom: Spacing["4xl"] },

  contextCard: {
    gap: 4,
    backgroundColor: "#EBF2FF",
    borderColor: Colors.primary + "30",
  },
  contextLabel: { fontSize: 11, fontWeight: "700", color: Colors.primary, letterSpacing: 0.5 },
  contextTitle: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  contextSub: { fontSize: 12, color: Colors.textSecondary },

  section: { gap: Spacing.md },
  stepLabel: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  fieldError: { fontSize: 12, color: Colors.error },

  criterionList: { gap: Spacing.sm },
  criterionBtn: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  criterionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EBF2FF",
  },
  criterionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  radioCircleActive: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  criterionTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  criterionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  existingCount: { fontSize: 11, color: Colors.teal, fontWeight: "600", paddingLeft: 32 },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  typeBtn: {
    flex: 1,
    minWidth: "28%",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EBF2FF",
  },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  typeLabelActive: { color: Colors.primary },
  typeDescription: { fontSize: 13, color: Colors.textSecondary },

  uploadArea: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundMuted,
  },
  uploadIcon: { fontSize: 36 },
  uploadTitle: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  uploadHint: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },

  submitBtn: { marginTop: Spacing.sm },

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
