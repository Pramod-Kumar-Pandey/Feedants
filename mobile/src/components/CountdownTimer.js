import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../theme/colors';

function formatDuration(ms) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s };
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * Ticks locally every second but anchors itself to `serverTime` (returned
 * by the API alongside the target date) so a phone with a wrong system
 * clock still shows an accurate countdown — we compute the client/server
 * offset once on mount rather than trusting Date.now() directly.
 */
export default function CountdownTimer({ label, targetDate, serverTime, onExpire }) {
  const offsetMs = useMemo(() => {
    if (!serverTime) return 0;
    return new Date(serverTime).getTime() - Date.now();
  }, [serverTime]);

  const [now, setNow] = useState(Date.now() + offsetMs);

  useEffect(() => {
    const id = setInterval(() => {
      const current = Date.now() + offsetMs;
      setNow(current);
      if (targetDate && current >= new Date(targetDate).getTime()) {
        onExpire && onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [offsetMs, targetDate, onExpire]);

  if (!targetDate) return null;

  const diff = new Date(targetDate).getTime() - now;
  const { d, h, m, s } = formatDuration(diff);
  const expired = diff <= 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{expired ? 'Updating…' : label}</Text>
      {!expired && (
        <View style={styles.timeRow}>
          {d > 0 && <TimeBlock value={d} unit="d" />}
          <TimeBlock value={h} unit="h" />
          <TimeBlock value={m} unit="m" />
          <TimeBlock value={s} unit="s" />
        </View>
      )}
    </View>
  );
}

function TimeBlock({ value, unit }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockValue}>{pad(value)}</Text>
      <Text style={styles.blockUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  block: {
    backgroundColor: colors.text,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 44,
    alignItems: 'center',
  },
  blockValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  blockUnit: { color: '#ffffffaa', fontSize: 10 },
});
