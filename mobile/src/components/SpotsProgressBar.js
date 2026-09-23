import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../theme/colors';

/**
 * Shows current/max participants with a fill bar. Unlimited competitions
 * (max === null) show a simple count instead of a bar, since "percent
 * full" is meaningless without a cap.
 */
export default function SpotsProgressBar({ current, max, isFull }) {
  if (max == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{current} joined</Text>
      </View>
    );
  }

  const pct = Math.min(current / max, 1);
  const barColor = isFull ? colors.danger : pct > 0.8 ? colors.warning : colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          {current} / {max} joined
        </Text>
        {isFull ? (
          <Text style={[styles.tag, { color: colors.danger }]}>Full</Text>
        ) : (
          <Text style={styles.tag}>{max - current} spots left</Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { ...typography.caption, color: colors.text, fontWeight: '600' },
  tag: { ...typography.caption, color: colors.textMuted },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
