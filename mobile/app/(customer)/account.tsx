/**
 * app/(customer)/account.tsx — Customer account / profile screen.
 *
 * Shows account info, preferences, and sign-out. No backend calls.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import { MOCK_CUSTOMER_USER, MOCK_SERVICE_REQUESTS } from "../../data/mockData";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Divider } from "../../components/ui/Divider";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  destructive?: boolean;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  toggle,
  toggleValue,
  onToggle,
  destructive,
}: SettingRowProps) {
  if (toggle) {
    return (
      <View style={styles.settingRow}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={[styles.settingLabel, { flex: 1 }]}>{label}</Text>
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.teal }}
          thumbColor={Colors.white}
        />
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.75 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text
        style={[
          styles.settingLabel,
          { flex: 1 },
          destructive && { color: Colors.error },
        ]}
      >
        {label}
      </Text>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

export default function CustomerAccountScreen() {
  const { user, logout } = useAuth();
  const customer = MOCK_CUSTOMER_USER;

  const [notifications, setNotifications] = useState(true);
  const [locationAccess, setLocationAccess] = useState(false);

  const myRequests = MOCK_SERVICE_REQUESTS.filter(
    (r) => r.customer.id === customer.id
  );
  const completedCount = myRequests.filter((r) => r.status === "completed").length;
  const activeCount = myRequests.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  ).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Profile hero */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Avatar name={customer.name} size={68} backgroundColor={Colors.roleCustomer} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{customer.name}</Text>
            <Text style={styles.heroEmail}>{customer.email}</Text>
            <Text style={styles.heroPhone}>{customer.phone}</Text>
          </View>
        </View>

        <Divider />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myRequests.length}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.teal }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </Card>

      {/* Account info */}
      <Card padded={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <Divider spacing={0} />
        <SettingRow icon="📧" label="Email" value={customer.email} />
        <Divider spacing={0} />
        <SettingRow icon="📱" label="Phone" value={customer.phone} />
        <Divider spacing={0} />
        <SettingRow
          icon="🔒"
          label="Change Password"
          onPress={() => {}}
        />
        <Divider spacing={0} />
        <SettingRow
          icon="👤"
          label="Account type"
          value="Customer"
        />
      </Card>

      {/* Preferences */}
      <Card padded={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preferences</Text>
        </View>
        <Divider spacing={0} />
        <SettingRow
          icon="🔔"
          label="Push notifications"
          toggle
          toggleValue={notifications}
          onToggle={setNotifications}
        />
        <Divider spacing={0} />
        <SettingRow
          icon="📍"
          label="Location access"
          toggle
          toggleValue={locationAccess}
          onToggle={setLocationAccess}
        />
        <Divider spacing={0} />
        <SettingRow icon="🌐" label="Language" value="English" onPress={() => {}} />
      </Card>

      {/* Support */}
      <Card padded={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Support</Text>
        </View>
        <Divider spacing={0} />
        <SettingRow icon="❓" label="Help Centre" onPress={() => {}} />
        <Divider spacing={0} />
        <SettingRow icon="📋" label="Terms of Service" onPress={() => {}} />
        <Divider spacing={0} />
        <SettingRow icon="🛡️" label="Privacy Policy" onPress={() => {}} />
        <Divider spacing={0} />
        <SettingRow icon="⭐" label="Rate the App" onPress={() => {}} />
      </Card>

      {/* Danger zone */}
      <Card padded={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
        </View>
        <Divider spacing={0} />
        <SettingRow
          icon="🚪"
          label="Sign out"
          destructive
          onPress={() => {
            logout();
            router.replace("/");
          }}
        />
        <Divider spacing={0} />
        <SettingRow
          icon="⚠️"
          label="Delete account"
          destructive
          onPress={() => {}}
        />
      </Card>

      <Text style={styles.version}>CraftRelay v1.0.0 · SIH 2025</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing["4xl"] },

  heroCard: { gap: Spacing.md },
  heroTop: { flexDirection: "row", gap: Spacing.base, alignItems: "flex-start" },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  heroEmail: { fontSize: 13, color: Colors.textSecondary },
  heroPhone: { fontSize: 13, color: Colors.textMuted },

  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 3, flex: 1 },
  statValue: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.divider },

  sectionHeader: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  settingIcon: { fontSize: 18, width: 26 },
  settingLabel: { fontSize: 15, color: Colors.textPrimary },
  settingValue: { fontSize: 14, color: Colors.textSecondary },
  chevron: { fontSize: 20, color: Colors.textMuted },

  version: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
