/**
 * app/(admin)/_layout.tsx — Admin tab navigator.
 *
 * Amber accent colour differentiates admin from other roles.
 */

import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { TabIcon } from "../../components/shared/TabIcon";

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
          tabBarIcon: ({ focused }) => <TabIcon name="overview" focused={focused} />,
          headerTitle: "Admin Overview",
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarLabel: "Users",
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
          headerTitle: "User Management",
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: "Assessments",
          tabBarLabel: "Assessments",
          tabBarIcon: ({ focused }) => <TabIcon name="queue" focused={focused} />,
          headerTitle: "All Assessments",
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "Audit Logs",
          tabBarLabel: "Logs",
          tabBarIcon: ({ focused }) => <TabIcon name="audit" focused={focused} />,
          headerTitle: "Audit Log",
        }}
      />
    </Tabs>
  );
}
