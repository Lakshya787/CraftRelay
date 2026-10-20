/**
 * app/(customer)/new-request.tsx — Create Service Request Screen.
 *
 * Allows customers to submit a service request to a specific skilled worker.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { useWorkerDetail, useCreateServiceRequest } from "../../hooks/useMarketplace";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Divider } from "../../components/ui/Divider";

export default function NewServiceRequestScreen() {
  const params = useLocalSearchParams<{ workerId: string; workerName?: string }>();
  const workerId = Array.isArray(params.workerId) ? params.workerId[0] : params.workerId ?? "";
  const paramWorkerName = Array.isArray(params.workerName) ? params.workerName[0] : params.workerName;

  const { worker } = useWorkerDetail(workerId);
  const { createRequest, loading: submitting, error: submitError } = useCreateServiceRequest();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(worker?.city ? `${worker.city}, ${worker.state ?? ""}` : "");
  const [preferredDate, setPreferredDate] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
  }>({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const workerDisplayName = worker?.full_name || paramWorkerName || "Selected Professional";
  const workerTrade = worker?.trade_title || "Skilled Craftsman";

  function validate(): boolean {
    const errors: { title?: string } = {};
    if (!title.trim()) {
      errors.title = "Job title is required.";
    } else if (title.trim().length < 5) {
      errors.title = "Job title must be at least 5 characters.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (!workerId) {
      Alert.alert("Error", "No worker specified for this request.");
      return;
    }

    try {
      await createRequest({
        worker_profile_id: workerId,
        title: title.trim(),
        description: description.trim() || undefined,
        service_location: location.trim() || undefined,
        preferred_date: preferredDate.trim() || undefined,
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        router.replace("/(customer)/requests" as any);
      }, 1500);
    } catch {
      // submitError is populated by useCreateServiceRequest
    }
  }

  if (submittedSuccess) {
    return (
      <View style={styles.successScreen}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Request Submitted!</Text>
        <Text style={styles.successDesc}>
          Your request has been sent to {workerDisplayName}. They will review and respond soon.
        </Text>
        <Button
          label="View My Requests"
          variant="primary"
          size="lg"
          onPress={() => router.replace("/(customer)/requests" as any)}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Worker Info Card */}
        <Card style={styles.workerSummaryCard}>
          <View style={styles.workerSummaryRow}>
            <Avatar name={workerDisplayName} size={50} backgroundColor={Colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.workerLabel}>Requesting service from:</Text>
              <Text style={styles.workerName}>{workerDisplayName}</Text>
              <Text style={styles.workerTrade}>{workerTrade}</Text>
            </View>
          </View>
        </Card>

        {/* Form Card */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Job Details</Text>
          <Divider spacing={Spacing.xs} />

          {submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {submitError}</Text>
            </View>
          ) : null}

          {/* Job Title */}
          <TextInput
            label="Job Title"
            required
            placeholder="e.g. Electrical wiring repair in kitchen"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (validationErrors.title) {
                setValidationErrors({});
              }
            }}
            error={validationErrors.title}
            hint="Brief title describing the work needed (min. 5 characters)"
          />

          {/* Description */}
          <TextInput
            label="Description"
            placeholder="Describe the issue, required tools/materials, or specific instructions…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            containerStyle={styles.multilineContainer}
            style={styles.multilineInput}
            hint="Optional details to help the worker provide an accurate estimate"
          />

          {/* Location */}
          <TextInput
            label="Service Location"
            placeholder="e.g. Flat 402, Sunshine Heights, Andheri West, Mumbai"
            value={location}
            onChangeText={setLocation}
            leftIcon={<Text style={{ fontSize: 14 }}>📍</Text>}
            hint="Where will the service take place?"
          />

          {/* Preferred Date */}
          <TextInput
            label="Preferred Date / Time"
            placeholder="e.g. 2026-10-25 or Tomorrow afternoon"
            value={preferredDate}
            onChangeText={setPreferredDate}
            leftIcon={<Text style={{ fontSize: 14 }}>🗓️</Text>}
            hint="Guidance: Provide a date format YYYY-MM-DD or preferred timing"
          />

          <Button
            label={submitting ? "Submitting Request…" : "Submit Request"}
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submitBtn}
            accessibilityLabel="Submit service request"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.base,
    gap: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  workerSummaryCard: {
    backgroundColor: "#F0F7FF",
    borderColor: Colors.primary + "30",
  },
  workerSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  workerLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  workerTrade: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
  formCard: {
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  multilineContainer: {
    minHeight: 110,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  errorBanner: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.error + "40",
  },
  errorBannerText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: "600",
  },
  successScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.sm,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
