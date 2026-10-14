/**
 * components/ui/ConfirmDialog.tsx — Simple confirmation modal.
 */

import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { Colors } from "../../constants/colors";
import { Spacing, Radius } from "../../constants/spacing";
import { Button } from "./Button";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="outline"
              size="md"
              onPress={onCancel}
              style={styles.btn}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? "danger" : "primary"}
              size="md"
              onPress={onConfirm}
              style={styles.btn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 360,
    gap: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  btn: {
    flex: 1,
  },
});
