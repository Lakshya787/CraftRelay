/**
 * app/(admin)/_layout.tsx — Admin tab navigator.
 *
 * Amber accent colour differentiates admin from other roles.
 */

import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Text } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.roleAdmin,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.divider,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: Colors.backgroundCard },
        headerTitleStyle: { fontWeight: "700", fontSize: 17, color: Colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Admin Dashboard",
          tabBarLabel: "Overview",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
          headerTitle: "Admin Overview",
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarLabel: "Users",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
          headerTitle: "User Management",
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: "Assessments",
          tabBarLabel: "Assessments",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
          headerTitle: "All Assessments",
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "Audit Logs",
          tabBarLabel: "Logs",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📜" focused={focused} />,
          headerTitle: "Audit Log",
        }}
      />
    </Tabs>
  );
}
