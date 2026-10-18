/**
 * app/(worker)/_layout.tsx — Worker tab navigator.
 */

import { Tabs, router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Text, Pressable } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function WorkerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabBarActive,
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
        headerStyle: {
          backgroundColor: Colors.backgroundCard,
        },
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 17,
          color: Colors.textPrimary,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          headerTitle: "My Dashboard",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
          headerTitle: "My Profile",
        }}
      />
      <Tabs.Screen
        name="qualifications"
        options={{
          title: "Qualifications",
          tabBarLabel: "Skills",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
          headerTitle: "My Qualifications",
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarLabel: "Jobs",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💼" focused={focused} />,
          headerTitle: "Service Requests",
        }}
      />
      <Tabs.Screen
        name="evidence-submit"
        options={{
          title: "Submit Evidence",
          headerTitle: "Submit Evidence",
          href: null, // hidden from tab bar
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={{ fontSize: 15, color: Colors.primary, fontWeight: "600" }}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
