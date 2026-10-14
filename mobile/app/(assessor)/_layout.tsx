/**
 * app/(assessor)/_layout.tsx — Assessor tab navigator.
 */

import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Text } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function AssessorLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.roleAssessor,
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
          title: "Assessment Queue",
          tabBarLabel: "Queue",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
          headerTitle: "Assessment Queue",
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          tabBarLabel: "Review",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
          headerTitle: "Review Assessment",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
          headerTitle: "Assessment History",
        }}
      />
    </Tabs>
  );
}
