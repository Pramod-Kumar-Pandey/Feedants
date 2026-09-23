import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/colors';

/**
 * Single reusable CTA button. Variant drives color: the join/leave/view
 * actions from the details screen map cleanly onto 'primary' | 'muted' |
 * 'danger' so the screen never needs bespoke button styling per state.
 */
export default function PrimaryButton({ label, onPress, disabled, loading, variant = 'primary' }) {
  const palette = {
    primary: { bg: colors.primary, fg: '#fff' },
    danger: { bg: colors.danger, fg: '#fff' },
    muted: { bg: colors.disabled, fg: '#fff' },
  }[variant];

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: isDisabled ? colors.disabled : palette.bg }]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  label: { ...typography.h2, fontSize: 16 },
});
