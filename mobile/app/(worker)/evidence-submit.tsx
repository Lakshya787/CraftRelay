/**
 * app/(worker)/evidence-submit.tsx — Evidence submission screen (real API).
 *
 * Features:
 *  • Select photo from gallery (expo-image-picker)
 *  • Take photo with camera where supported
 *  • Enter title and description
 *  • Choose evidence type and link to a criterion
 *  • Upload via POST /evidence/upload (multipart) or POST /evidence/url
 *  • Display upload progress and error states
 *  • View previously submitted evidence
 *  • Show review status per evidence item
 *
 * File validation:
 *  • Size limit enforced on the client before upload (guard only — server re-validates)
 *  • MIME type is sent as a hint only — server detects from magic bytes
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { useQualifications } from "../../hooks/useQualifications";
import { useWorkerProfile } from "../../hooks/useWorkerProfile";
import { useEvidenceDrafts } from "../../hooks/useEvidenceDrafts";
import {
  useMyEvidence,
  useSubmitFileEvidence,
  useSubmitURLEvidence,
  EvidenceType,
  EvidenceItemData,
} from "../../hooks/useEvidence";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_MB = 15;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const EVIDENCE_TYPE_OPTIONS: Array<{
  type: EvidenceType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: "photo", label: "Photo", icon: "📷", description: "Photograph of your work" },
  { type: "video", label: "Video", icon: "🎥", description: "Short video demonstration" },
  { type: "certificate", label: "Certificate", icon: "🏅", description: "Training or certification document" },
  { type: "document", label: "Document", icon: "📄", description: "PDF, report, or worksheet" },
  { type: "other", label: "URL", icon: "🔗", description: "Link to external proof" },
];

// ── Review status helpers ─────────────────────────────────────────────────────

function reviewStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending Review";
    case "under_review": return "Under Review";
    case "accepted": return "Accepted ✓";
    case "rejected": return "Rejected";
    default: return status;
  }
}

function reviewStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "accepted": return "success";
    case "under_review": return "warning";
    case "rejected": return "error";
    default: return "default";
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  evidenceType: EvidenceType;
  url: string;
  criterionId: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  url?: string;
  file?: string;
}

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  sizeBytes?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EvidenceSubmitScreen() {
  const { profile } = useWorkerProfile();
  const { qualifications, loading: qualsLoading } = useQualifications();
  const { items: myEvidence, loading: evidenceLoading, refetch: refetchEvidence } =
    useMyEvidence();
  const { submit: submitFile, submitting: uploadingFile, error: uploadError } =
    useSubmitFileEvidence();
  const { submit: submitUrl, submitting: uploadingUrl, error: urlError } =
    useSubmitURLEvidence();
  const {
    drafts,
    loading: draftsLoading,
    syncingId,
    syncProgress,
    saveAsDraft,
    removeDraft,
    syncSingleDraft,
    syncAllPending,
  } = useEvidenceDrafts(profile?.id);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    evidenceType: "photo",
    url: "",
    criterionId: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const isURLMode = form.evidenceType === "other";
  const isSubmitting = uploadingFile || uploadingUrl || savingDraft;

  async function handleSaveDraft() {
    if (form.title.trim().length < 3) {
      setErrors((e) => ({
        ...e,
        title: "Title must be at least 3 characters to save draft.",
      }));
      return;
    }
    setSavingDraft(true);
    try {
      await saveAsDraft({
        title: form.title,
        description: form.description,
        evidence_type: form.evidenceType,
        file_uri: selectedFile?.uri,
        file_name: selectedFile?.name,
        mime_type: selectedFile?.type,
        file_url: form.url || null,
        criterion_id: form.criterionId || null,
      });
      Alert.alert(
        "Draft Saved (Offline)",
        "Evidence draft was saved locally on this device. You can sync it whenever your connection returns."
      );
      setForm({ title: "", description: "", evidenceType: "photo", url: "", criterionId: "" });
      setSelectedFile(null);
      setErrors({});
    } catch (err: any) {
      Alert.alert("Draft Save Failed", err.message || "Failed to save local draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  function update<K extends keyof FormState>(field: K) {
    return (value: FormState[K]) => {
      setForm((f) => ({ ...f, [field]: value }));
      setErrors((e) => ({ ...e, [field]: undefined }));
    };
  }

  // ── File selection ────────────────────────────────────────────────────────

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Gallery access is required to select a file."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        form.evidenceType === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const sizeBytes = (asset as any).fileSize ?? undefined;
      if (sizeBytes && sizeBytes > MAX_FILE_BYTES) {
        setErrors((e) => ({
          ...e,
          file: `File is too large. Maximum allowed size is ${MAX_FILE_MB} MB.`,
        }));
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName ?? `evidence_${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
        sizeBytes,
      });
      setErrors((e) => ({ ...e, file: undefined }));
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: "image/jpeg",
        sizeBytes: (asset as any).fileSize,
      });
      setErrors((e) => ({ ...e, file: undefined }));
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.title.trim()) e.title = "Title is required";
    else if (form.title.trim().length < 3) e.title = "At least 3 characters";

    if (!form.description.trim()) e.description = "Description is required";

    if (isURLMode && !form.url.trim()) e.url = "URL is required";
    if (!isURLMode && !selectedFile) e.file = "Please select a file";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) return;
    try {
      if (isURLMode) {
        await submitUrl({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          url: form.url.trim(),
          criterion_id: form.criterionId || undefined,
        });
      } else {
        await submitFile({
          file: selectedFile!,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          evidence_type: form.evidenceType,
          criterion_id: form.criterionId || undefined,
        });
      }
      setSubmitted(true);
      await refetchEvidence();
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message ?? "Please try again.");
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Evidence Submitted</Text>
        <Text style={styles.successMessage}>
          Your evidence has been submitted for review. An assessor will
          evaluate it and you will be notified of the outcome.
        </Text>
        <Button
          label="Submit More Evidence"
          variant="outline"
          onPress={() => {
            setSubmitted(false);
            setForm({ title: "", description: "", evidenceType: "photo", url: "", criterionId: "" });
            setSelectedFile(null);
          }}
        />
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* Offline Draft Capture Notice & Drafts List */}
      {drafts.length > 0 && (
        <Card style={styles.draftsContainer}>
          <View style={styles.draftsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftsTitle}>📦 Offline Drafts ({drafts.length})</Text>
              <Text style={styles.draftsSubtitle}>
                Stored locally on this device. Sync when connection returns.
              </Text>
            </View>
            {drafts.some((d) => d.sync_status === "draft" || d.sync_status === "failed") && (
              <Button
                label="Sync All"
                variant="primary"
                size="sm"
                onPress={syncAllPending}
                loading={syncingId !== null}
              />
            )}
          </View>

          <View style={styles.draftsList}>
            {drafts.map((draft) => {
              const isSyncing = syncingId === draft.id;
              let badgeVariant: "default" | "warning" | "success" | "error" = "default";
              let badgeLabel = "Draft (Offline)";
              if (isSyncing) {
                badgeVariant = "warning";
                badgeLabel = `Syncing (${syncProgress}%)`;
              } else if (draft.sync_status === "synced") {
                badgeVariant = "success";
                badgeLabel = "Synced ✓";
              } else if (draft.sync_status === "failed") {
                badgeVariant = "error";
                badgeLabel = "Sync Failed";
              } else if (draft.sync_status === "conflict") {
                badgeVariant = "error";
                badgeLabel = "Conflict";
              }

              return (
                <View key={draft.id} style={styles.draftItem}>
                  <View style={styles.draftItemRow}>
                    <Text style={styles.draftItemIcon}>
                      {draft.evidence_type === "photo" ? "📷" : draft.file_url ? "🔗" : "📄"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.draftItemTitle} numberOfLines={1}>
                        {draft.title}
                      </Text>
                      {draft.file_name && (
                        <Text style={styles.draftItemMeta} numberOfLines={1}>
                          {draft.file_name}
                        </Text>
                      )}
                      {draft.sync_error && (
                        <Text style={styles.draftItemError} numberOfLines={2}>
                          {draft.sync_error}
                        </Text>
                      )}
                    </View>
                    <Badge label={badgeLabel} variant={badgeVariant} size="sm" />
                  </View>

                  <View style={styles.draftActions}>
                    {draft.sync_status !== "synced" && (
                      <Pressable
                        style={[styles.draftActionBtn, styles.draftSyncBtn]}
                        onPress={() => syncSingleDraft(draft.id)}
                        disabled={isSyncing}
                      >
                        <Text style={styles.draftSyncBtnText}>
                          {draft.sync_status === "failed" ? "Retry Sync" : "Sync Now"}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.draftActionBtn, styles.draftDeleteBtn]}
                      onPress={() => removeDraft(draft.id)}
                    >
                      <Text style={styles.draftDeleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Step 1 — Qualification & criterion */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>1. Link to a Criterion (Optional)</Text>
        {qualsLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <View style={styles.criterionList}>
            {qualifications.slice(0, 3).map((q) => (
              <Pressable
                key={q.id}
                style={[
                  styles.criterionBtn,
                  form.criterionId.startsWith(q.id) && styles.criterionBtnActive,
                ]}
                onPress={() =>
                  update("criterionId")(
                    form.criterionId.startsWith(q.id) ? "" : q.id
                  )
                }
              >
                <Text style={styles.criterionTitle}>{q.title}</Text>
                <Text style={styles.criterionSub}>
                  {q.trade} · Level {q.level}
                  {q.is_illustrative ? " · Illustrative" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Step 2 — Evidence type */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>2. Evidence Type</Text>
        <View style={styles.typeGrid}>
          {EVIDENCE_TYPE_OPTIONS.map(({ type, label, icon }) => {
            const selected = form.evidenceType === type;
            return (
              <Pressable
                key={type}
                style={[styles.typeBtn, selected && styles.typeBtnActive]}
                onPress={() => {
                  update("evidenceType")(type);
                  setSelectedFile(null);
                  setErrors({});
                }}
              >
                <Text style={styles.typeIcon}>{icon}</Text>
                <Text style={[styles.typeLabel, selected && styles.typeLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Step 3 — File or URL */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>3. Select File or Enter URL</Text>

        {isURLMode ? (
          <TextInput
            label="External URL"
            value={form.url}
            onChangeText={update("url")}
            error={errors.url}
            placeholder="https://…"
            keyboardType="url"
            autoCapitalize="none"
            required
          />
        ) : (
          <>
            {selectedFile ? (
              <View style={styles.filePreview}>
                {selectedFile.type.startsWith("image/") && (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatBytes(selectedFile.sizeBytes ?? null)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedFile(null)}
                  style={styles.clearFile}
                >
                  <Text style={styles.clearFileText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.uploadActions}>
                <Pressable style={styles.uploadBtn} onPress={pickFromGallery}>
                  <Text style={styles.uploadBtnIcon}>🖼</Text>
                  <Text style={styles.uploadBtnLabel}>Gallery</Text>
                </Pressable>
                <Pressable style={styles.uploadBtn} onPress={takePhoto}>
                  <Text style={styles.uploadBtnIcon}>📷</Text>
                  <Text style={styles.uploadBtnLabel}>Camera</Text>
                </Pressable>
              </View>
            )}
            {errors.file ? (
              <Text style={styles.fieldError}>{errors.file}</Text>
            ) : null}
            <Text style={styles.fileHint}>
              Max {MAX_FILE_MB} MB · Images, PDFs, and short videos accepted.
              File type is re-detected server-side.
            </Text>
          </>
        )}
      </View>

      {/* Step 4 — Details */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>4. Evidence Details</Text>
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
      </View>

      {/* Upload error */}
      {(uploadError || urlError) && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorCardText}>
            ⚠️ {uploadError ?? urlError}
          </Text>
        </Card>
      )}

      {/* Submit */}
      {isSubmitting ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.uploadingText}>
            Uploading evidence… please wait
          </Text>
        </View>
      ) : (
        <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          <Button
            label="Submit Evidence"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
          <Button
            label="Save as Offline Draft 💾"
            variant="outline"
            size="md"
            fullWidth
            onPress={handleSaveDraft}
          />
        </View>
      )}

      {/* Previous evidence */}
      <View style={styles.section}>
        <Text style={styles.stepLabel}>My Submitted Evidence</Text>
        {evidenceLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : myEvidence.length === 0 ? (
          <EmptyState
            icon="📎"
            title="No evidence submitted yet"
            description="Upload photos, certificates, or documents above."
          />
        ) : (
          <View style={styles.evidenceList}>
            {myEvidence.map((item) => (
              <EvidenceListItem key={item.id} item={item} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ── Evidence list item component ──────────────────────────────────────────────

function EvidenceListItem({ item }: { item: EvidenceItemData }) {
  const typeOption = EVIDENCE_TYPE_OPTIONS.find(
    (o) => o.type === item.evidence_type
  );
  return (
    <Card style={styles.evidenceItem}>
      <View style={styles.evidenceItemHeader}>
        <Text style={styles.evidenceItemIcon}>{typeOption?.icon ?? "📄"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.evidenceItemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.original_filename && (
            <Text style={styles.evidenceItemFilename} numberOfLines={1}>
              {item.original_filename}
              {item.file_size_bytes ? ` · ${formatBytes(item.file_size_bytes)}` : ""}
            </Text>
          )}
        </View>
        <Badge
          label={reviewStatusLabel(item.review_status)}
          variant={reviewStatusVariant(item.review_status)}
          size="sm"
        />
      </View>
      {item.description && (
        <Text style={styles.evidenceItemDesc} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {item.review_note && (
        <View style={styles.reviewNote}>
          <Text style={styles.reviewNoteLabel}>Assessor note:</Text>
          <Text style={styles.reviewNoteText}>{item.review_note}</Text>
        </View>
      )}
      <Text style={styles.evidenceItemDate}>
        Submitted {new Date(item.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </Text>
    </Card>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: {
    padding: Spacing.base,
    gap: Spacing.xl,
    paddingBottom: Spacing["4xl"],
  },

  section: { gap: Spacing.md },
  stepLabel: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: -Spacing.xs },

  criterionList: { gap: Spacing.sm },
  criterionBtn: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    gap: 2,
  },
  criterionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EBF2FF",
  },
  criterionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  criterionSub: { fontSize: 12, color: Colors.textSecondary },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
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

  uploadActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  uploadBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundMuted,
  },
  uploadBtnIcon: { fontSize: 28 },
  uploadBtnLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  fileHint: { fontSize: 11, color: Colors.textMuted, lineHeight: 15 },

  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundCard,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundMuted,
  },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  fileSize: { fontSize: 11, color: Colors.textMuted },
  clearFile: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  clearFileText: { fontSize: 12, color: Colors.error, fontWeight: "700" },

  errorCard: {
    backgroundColor: Colors.error + "10",
    borderColor: Colors.error + "30",
  },
  errorCardText: { fontSize: 13, color: Colors.error, lineHeight: 18 },

  uploadingContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  uploadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

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

  evidenceList: { gap: Spacing.sm },
  evidenceItem: { gap: Spacing.xs },
  evidenceItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  evidenceItemIcon: { fontSize: 20, marginTop: 1 },
  evidenceItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  evidenceItemFilename: { fontSize: 11, color: Colors.textMuted },
  evidenceItemDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  evidenceItemDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  reviewNote: {
    backgroundColor: Colors.warning + "15",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    gap: 2,
  },
  reviewNoteLabel: { fontSize: 11, fontWeight: "700", color: Colors.warning },
  reviewNoteText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },

  // ── Offline Drafts styles ───────────────────────────────────────────────────
  draftsContainer: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  draftsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  draftsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  draftsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  draftsList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  draftItem: {
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  draftItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  draftItemIcon: {
    fontSize: 18,
  },
  draftItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  draftItemMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  draftItemError: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: "500",
    marginTop: 2,
  },
  draftActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: 4,
  },
  draftActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  draftSyncBtn: {
    backgroundColor: Colors.primary,
  },
  draftSyncBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.white,
  },
  draftDeleteBtn: {
    backgroundColor: Colors.error + "15",
  },
  draftDeleteBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.error,
  },
});
