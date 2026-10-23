/**
 * app/(customer)/_layout.tsx — Customer tab navigator.
 */

import React, { useEffect } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { Colors } from "../../constants/colors";
import { Text, Pressable } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { TabIcon } from "../../components/shared/TabIcon";

export default function CustomerLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    const isCustomer = isAuthenticated && user?.role === "customer";
    const isPublicPath =
      pathname === "/(customer)" ||
      pathname === "/(customer)/" ||
      pathname === "/(customer)/index" ||
      pathname.includes("/worker");

    // If not authenticated or wrong role, redirect to /(customer)/index if accessing protected customer tabs
    if (!isCustomer && !isPublicPath) {
      router.replace("/(customer)" as any);
    }
  }, [isLoading, isAuthenticated, user, pathname]);

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
          tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} />,
          headerTitle: "Find a Professional",
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "My Requests",
          tabBarLabel: "My Requests",
          tabBarIcon: ({ focused }) => <TabIcon name="requests" focused={focused} />,
          headerTitle: "My Service Requests",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          headerTitle: "Customer Profile",
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen
        name="worker/[id]"
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
              <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: "600" }}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="new-request"
        options={{
          title: "Request Service",
          headerTitle: "Request Service",
          href: null,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: "600" }}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="request/[id]"
        options={{
          title: "Request Details",
          headerTitle: "Service Request",
          href: null,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: "600" }}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="worker-detail"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
