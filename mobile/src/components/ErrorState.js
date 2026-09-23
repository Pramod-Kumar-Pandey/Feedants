import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { colors, spacing, typography } from '../theme/colors';

export default function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message || 'Please try again.'}</Text>
      <View style={{ width: '60%', marginTop: spacing.md }}>
        <PrimaryButton label="Retry" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
