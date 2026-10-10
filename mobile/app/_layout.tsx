/**
 * app/_layout.tsx — Root layout for Expo Router.
 *
 * This is the top-level layout that wraps all routes.
 * Future: add auth context, TanStack Query provider, theme provider here.
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0F172A" },
          headerTintColor: "#F8FAFC",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0F172A" },
        }}
      />
    </>
  );
}
