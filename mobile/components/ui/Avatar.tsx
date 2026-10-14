/**
 * components/ui/Avatar.tsx — User avatar with initials fallback.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

interface AvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, size = 44, backgroundColor = Colors.primary }: AvatarProps) {
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: Colors.white,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
