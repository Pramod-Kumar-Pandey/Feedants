import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../theme/colors';

const STATUS_META = {
  UPCOMING: { label: 'Upcoming', bg: '#EEF1FF', fg: '#4A5BD6' },
  REGISTRATION_OPEN: { label: 'Registration Open', bg: '#E7F8ED', fg: colors.success },
  REGISTRATION_CLOSED: { label: 'Registration Closed', bg: '#FFF3E0', fg: colors.warning },
  ONGOING: { label: 'Live Now', bg: '#FFEDEA', fg: colors.danger },
  ENDED: { label: 'Ended', bg: '#F1F2F4', fg: colors.textMuted },
  CANCELLED: { label: 'Cancelled', bg: '#F1F2F4', fg: colors.danger },
  DRAFT: { label: 'Draft', bg: '#F1F2F4', fg: colors.textMuted },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.ENDED;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      {status === 'ONGOING' && <View style={styles.liveDot} />}
      <Text style={[styles.text, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  text: { ...typography.caption, fontWeight: '700' },
});
