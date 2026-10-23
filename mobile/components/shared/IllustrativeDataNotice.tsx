import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing } from "../../constants/spacing";

/** Marks legacy sample-only screens so sample rows are not mistaken for saved records. */
export function IllustrativeDataNotice() {
  return (
    <View accessibilityRole="text" style={styles.notice}>
      <Text style={styles.text}>Illustrative sample data — this screen is not connected to live records.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { padding: Spacing.sm, borderRadius: 8, backgroundColor: "#FFF7E6", borderWidth: 1, borderColor: Colors.warning },
  text: { color: Colors.textPrimary, fontSize: 12, lineHeight: 17 },
});
