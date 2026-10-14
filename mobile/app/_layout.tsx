/**
 * app/_layout.tsx — Root layout for Expo Router.
 *
 * Part 2: Adds AuthProvider context around all routes.
 * Part 3: Will add auth redirect logic here.
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: "#0F172A",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#F7F9FC" },
          headerBackTitle: "Back",
        }}
      />
    </AuthProvider>
  );
}
