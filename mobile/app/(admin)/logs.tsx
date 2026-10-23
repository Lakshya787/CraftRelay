/**
 * app/(admin)/logs.tsx — Audit log screen for admins.
 *
 * Chronological list of platform events. No backend calls.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { MOCK_AUDIT_LOGS } from "../../data/mockData";
import { IllustrativeDataNotice } from "../../components/shared/IllustrativeDataNotice";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Divider } from "../../components/ui/Divider";
import { EmptyState } from "../../components/ui/EmptyState";
import { Card } from "../../components/ui/Card";

type ActionCategory = "all" | "assessment" | "evidence" | "user" | "service_request";

const ACTION_FILTERS: { label: string; value: ActionCategory }[] = [
  { label: "All", value: "all" },
  { label: "Assessments", value: "assessment" },
  { label: "Evidence", value: "evidence" },
  { label: "Users", value: "user" },
  { label: "Requests", value: "service_request" },
];

function getActionColor(action: string): string {
  if (action.includes("approved") || action.includes("created")) return Colors.success;
  if (action.includes("rejected")) return Colors.error;
  if (action.includes("submitted")) return Colors.info;
  return Colors.textMuted;
}

function getActionIcon(action: string): string {
  if (action.startsWith("assessment")) return "📋";
  if (action.startsWith("evidence")) return "📎";
  if (action.startsWith("user")) return "👤";
  if (action.startsWith("service_request")) return "📬";
  return "📝";
}

function formatAction(action: string): string {
  return action.split(".").map(p => p.replace("_", " ")).join(" › ");
}

export default function AdminLogsScreen() {
  const [filter, setFilter] = useState<ActionCategory>("all");

  const filtered = MOCK_AUDIT_LOGS.filter((log) =>
    filter === "all" ? true : log.action.startsWith(filter)
  );

  return (
    <View style={styles.container}>
      <IllustrativeDataNotice />
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {ACTION_FILTERS.map(({ label, value }) => (
          <Pressable
            key={value}
            style={[styles.chip, filter === value && styles.chipActive]}
            onPress={() => setFilter(value)}
          >
            <Text
              style={[
                styles.chipLabel,
                filter === value && styles.chipLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="📜"
            title="No log entries"
            description="No events match the selected filter."
            actionLabel="Clear Filter"
            onAction={() => setFilter("all")}
          />
        }
        renderItem={({ item }) => {
          const actionColor = getActionColor(item.action);
          const actionIcon = getActionIcon(item.action);
          const formattedAction = formatAction(item.action);

          return (
            <Card style={styles.logCard}>
              <View style={styles.logRow}>
                {/* Icon */}
                <View style={[styles.iconCircle, { backgroundColor: actionColor + "20" }]}>
                  <Text style={styles.actionIcon}>{actionIcon}</Text>
                </View>

                {/* Details */}
                <View style={styles.logBody}>
                  <View style={styles.logHeader}>
                    <Text style={[styles.action, { color: actionColor }]}>
                      {formattedAction}
                    </Text>
                    <Text style={styles.timestamp}>
                      {new Date(item.timestamp).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  <Text style={styles.details}>{item.details}</Text>

                  <View style={styles.actorRow}>
                    <Avatar name={item.actor.name} size={20} />
                    <Text style={styles.actorName}>{item.actor.name}</Text>
                    <Badge
                      label={item.actor.role}
                      variant={
                        item.actor.role === "admin"
                          ? "warning"
                          : item.actor.role === "assessor"
                          ? "default"
                          : "primary"
                      }
                      size="sm"
                    />
                  </View>

                  <View style={styles.resourceRow}>
                    <Text style={styles.resourceType}>{item.resourceType}</Text>
                    <Text style={styles.resourceId}>#{item.resourceId}</Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.roleAdmin,
    borderColor: Colors.roleAdmin,
  },
  chipLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  chipLabelActive: { color: Colors.white },
  list: {
    padding: Spacing.base,
    paddingBottom: Spacing["4xl"],
  },
  logCard: { gap: 0 },
  logRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionIcon: { fontSize: 18 },
  logBody: { flex: 1, gap: Spacing.xs },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  action: { fontSize: 13, fontWeight: "700", flex: 1 },
  timestamp: { fontSize: 11, color: Colors.textMuted, flexShrink: 0 },
  details: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  actorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  actorName: { fontSize: 12, fontWeight: "600", color: Colors.textPrimary },
  resourceRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  resourceType: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    backgroundColor: Colors.backgroundMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resourceId: { fontSize: 11, color: Colors.textMuted, fontFamily: "monospace" },
});
