/**
 * app/(admin)/users.tsx — User management screen for admins.
 *
 * Searchable/filterable list of all platform users.
 * No backend calls — all data from mockData.
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
import { MOCK_USERS } from "../../data/mockData";
import type { UserRole } from "../../types/domain";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { TextInput } from "../../components/ui/TextInput";
import { EmptyState } from "../../components/ui/EmptyState";

const ROLE_FILTERS: Array<{ label: string; value: UserRole | "all" }> = [
  { label: "All", value: "all" },
  { label: "Workers", value: "worker" },
  { label: "Assessors", value: "assessor" },
  { label: "Customers", value: "customer" },
  { label: "Admins", value: "admin" },
];

const ROLE_COLORS: Record<UserRole, string> = {
  worker: Colors.roleWorker,
  assessor: Colors.roleAssessor,
  customer: Colors.roleCustomer,
  admin: Colors.roleAdmin,
};

const ROLE_VARIANT: Record<
  UserRole,
  "primary" | "teal" | "warning" | "success" | "error" | "default"
> = {
  worker: "primary",
  assessor: "default",
  customer: "teal",
  admin: "warning",
};

export default function AdminUsersScreen() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const filtered = MOCK_USERS.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchSection}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email or phone…"
          containerStyle={styles.searchInput}
        />
        {/* Role filter chips */}
        <View style={styles.filterRow}>
          {ROLE_FILTERS.map(({ label, value }) => (
            <Pressable
              key={value}
              style={[
                styles.chip,
                roleFilter === value && styles.chipActive,
              ]}
              onPress={() => setRoleFilter(value)}
            >
              <Text
                style={[
                  styles.chipLabel,
                  roleFilter === value && styles.chipLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.resultsCount}>
        {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="No users found"
            description="Try adjusting your search or role filter."
            actionLabel="Clear Filters"
            onAction={() => { setSearch(""); setRoleFilter("all"); }}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <View style={styles.cardRow}>
              <Avatar
                name={item.name}
                size={46}
                backgroundColor={ROLE_COLORS[item.role]}
              />
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Badge
                    label={item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                    variant={ROLE_VARIANT[item.role]}
                    size="sm"
                  />
                </View>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userPhone}>{item.phone}</Text>
              </View>
              <View style={styles.statusCol}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: item.isActive ? Colors.success : Colors.error },
                  ]}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    { color: item.isActive ? Colors.success : Colors.error },
                  ]}
                >
                  {item.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.joinedDate}>
                Joined{" "}
                {new Date(item.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              {/* Admin actions — labeled as non-functional in demo */}
              <View style={styles.actionRow}>
                <Pressable style={styles.actionBtn}>
                  <Text style={styles.actionBtnLabel}>View</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { borderColor: Colors.error }]}
                >
                  <Text style={[styles.actionBtnLabel, { color: Colors.error }]}>
                    {item.isActive ? "Suspend" : "Reinstate"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchSection: {
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: { marginHorizontal: Spacing.base },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
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
  resultsCount: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing["4xl"] },
  userCard: { gap: Spacing.md },
  cardRow: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  userInfo: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  userName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  userEmail: { fontSize: 12, color: Colors.textSecondary },
  userPhone: { fontSize: 12, color: Colors.textMuted },
  statusCol: { alignItems: "center", gap: 3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 10, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  joinedDate: { fontSize: 11, color: Colors.textMuted },
  actionRow: { flexDirection: "row", gap: Spacing.sm },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnLabel: { fontSize: 12, fontWeight: "600", color: Colors.primary },
});
