/**
 * components/shared/StatusIndicator.tsx — Assessment / service request status indicator.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import type { AssessmentStatus, ServiceRequestStatus, QualificationStatus } from "../../types/domain";

type StatusType = AssessmentStatus | ServiceRequestStatus | QualificationStatus;

interface StatusIndicatorProps {
  status: StatusType;
  style?: ViewStyle;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  // Assessment statuses
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warningBg },
  scheduled: { label: "Scheduled", color: Colors.info, bg: Colors.infoBg },
  in_progress: { label: "In Progress", color: Colors.primary, bg: "#E8F0FB" },
  completed: { label: "Completed", color: Colors.success, bg: Colors.successBg },
  cancelled: { label: "Cancelled", color: Colors.textMuted, bg: Colors.backgroundMuted },
  // Service request statuses
  open: { label: "Open", color: Colors.teal, bg: "#CCFBF1" },
  matched: { label: "Matched", color: Colors.info, bg: Colors.infoBg },
  accepted: { label: "Accepted", color: Colors.primary, bg: "#E8F0FB" },
  in_service: { label: "In Service", color: Colors.teal, bg: "#CCFBF1" },
  // Qualification statuses
  not_started: { label: "Not Started", color: Colors.textMuted, bg: Colors.backgroundMuted },
  submitted: { label: "Submitted", color: Colors.primary, bg: "#E8F0FB" },
  under_review: { label: "Under Review", color: Colors.warning, bg: Colors.warningBg },
  approved: { label: "Approved", color: Colors.success, bg: Colors.successBg },
  rejected: { label: "Rejected", color: Colors.error, bg: Colors.errorBg },
  expired: { label: "Expired", color: Colors.textMuted, bg: Colors.backgroundMuted },
};

export function StatusIndicator({ status, style }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    color: Colors.textSecondary,
    bg: Colors.backgroundMuted,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
