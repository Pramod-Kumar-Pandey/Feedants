import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../theme/colors';

export default function StatCard({ label, value, accent }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, accent && { color: colors.primary }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { ...typography.h2, color: colors.text },
  label: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
