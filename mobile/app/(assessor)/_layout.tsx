/**
 * app/(assessor)/_layout.tsx — Assessor tab navigator.
 */

import { Tabs, router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Pressable, Text } from "react-native";
import { TabIcon } from "../../components/shared/TabIcon";

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
          tabBarIcon: ({ focused }) => <TabIcon name="queue" focused={focused} />,
          headerTitle: "Assessment Queue",
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          headerTitle: "Review Assessment",
          href: null, // opened from the queue with a caseId
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={{ fontSize: 15, color: Colors.roleAssessor, fontWeight: "600" }}>
                ‹ Queue
              </Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
          headerTitle: "Assessment History",
        }}
      />
    </Tabs>
  );
}
