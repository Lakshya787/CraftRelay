/**
 * app/(customer)/_layout.tsx — Customer tab navigator.
 */

import { Tabs, router } from "expo-router";
import { Colors } from "../../constants/colors";
import { Text, Pressable } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.roleCustomer,
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
          title: "Discover Workers",
          tabBarLabel: "Discover",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
          headerTitle: "Find a Professional",
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "My Requests",
          tabBarLabel: "Requests",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📬" focused={focused} />,
          headerTitle: "My Service Requests",
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarLabel: "Account",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
          headerTitle: "My Account",
        }}
      />
      <Tabs.Screen
        name="worker-detail"
        options={{
          title: "Worker Profile",
          headerTitle: "Professional Profile",
          href: null,
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
