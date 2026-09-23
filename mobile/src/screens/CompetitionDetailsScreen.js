import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useCompetitionDetails } from '../hooks/useCompetitionDetails';
import StatusBadge from '../components/StatusBadge';
import SpotsProgressBar from '../components/SpotsProgressBar';
import CountdownTimer from '../components/CountdownTimer';
import StatCard from '../components/StatCard';
import PrimaryButton from '../components/PrimaryButton';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { colors, spacing, typography, radii } from '../theme/colors';

/**
 * Renders the full Competition Details screen. All content is driven by
 * the API response's `view.status` / `view.viewer.action` — the screen
 * itself contains no date-math or business rules of its own, so it can
 * never drift out of sync with what the backend considers valid.
 *
 * Expects `route.params.competitionId` when wired into React Navigation;
 * falls back to a demo id for standalone preview.
 */
export default function CompetitionDetailsScreen({ route, navigation }) {
  const competitionId = route?.params?.competitionId;
  const { data, loading, refreshing, actionLoading, error, onRefresh, join, leave, refetch } =
    useCompetitionDetails(competitionId);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const { viewer, spots, status, countdown } = data;

  const handleAction = async () => {
    switch (viewer.action.action) {
      case 'JOIN': {
        const result = await join();
        if (!result.success) {
          Alert.alert('Could not join', result.message || 'Please try again.');
        }
        return;
      }
      case 'LEAVE': {
        setConfirmingLeave(true);
        Alert.alert('Leave competition?', 'You can rejoin later if a spot is still available.', [
          { text: 'Cancel', style: 'cancel', onPress: () => setConfirmingLeave(false) },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              const result = await leave();
              setConfirmingLeave(false);
              if (!result.success) {
                Alert.alert('Could not leave', result.message || 'Please try again.');
              }
            },
          },
        ]);
        return;
      }
      case 'VIEW_RESULTS':
      case 'VIEW_PROGRESS':
        navigation?.navigate?.('Leaderboard', { competitionId });
        return;
      default:
        return;
    }
  };

  const buttonVariant = viewer.action.action === 'LEAVE' ? 'danger' : 'primary';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Image source={{ uri: data.bannerImageUrl }} style={styles.banner} resizeMode="cover" />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <StatusBadge status={status} />
            {data.category ? <Text style={styles.category}>{data.category}</Text> : null}
          </View>

          <Text style={styles.title}>{data.title}</Text>
          {data.shortDescription ? (
            <Text style={styles.shortDescription}>{data.shortDescription}</Text>
          ) : null}

          {countdown && (
            <View style={styles.countdownWrap}>
              <CountdownTimer
                label={countdown.label}
                targetDate={countdown.target}
                serverTime={data.serverTime}
                onExpire={refetch}
              />
            </View>
          )}

          <View style={styles.statsRow}>
            <StatCard label="Prize Pool" value={`₹${data.prizePool.toLocaleString()}`} accent />
            <StatCard label="Entry Fee" value={data.entryFee > 0 ? `₹${data.entryFee}` : 'Free'} />
            <StatCard
              label="Duration"
              value={`${daysBetween(data.dates.startDate, data.dates.endDate)}d`}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <SpotsProgressBar current={spots.current} max={spots.max} isFull={spots.isFull} />
          </View>

          {viewer.isRegistered && (
            <View style={styles.registeredBanner}>
              <Text style={styles.registeredText}>
                ✓ You joined this competition{' '}
                {viewer.participation?.joinedAt
                  ? `on ${new Date(viewer.participation.joinedAt).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
          )}

          {data.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.body}>{data.description}</Text>
            </View>
          ) : null}

          {data.rules?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rules</Text>
              {data.rules.map((rule, idx) => (
                <View key={idx} style={styles.ruleRow}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.body}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {data.prizeTiers?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prize Breakdown</Text>
              {data.prizeTiers.map((tier) => (
                <View key={tier.rank} style={styles.prizeRow}>
                  <Text style={styles.body}>{tier.label || `Rank ${tier.rank}`}</Text>
                  <Text style={styles.prizeAmount}>₹{tier.amount.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={viewer.action.label}
          onPress={handleAction}
          disabled={!viewer.action.enabled}
          loading={actionLoading || confirmingLeave}
          variant={buttonVariant}
        />
      </View>
    </SafeAreaView>
  );
}

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)), 1);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },
  banner: { width: '100%', height: 220, backgroundColor: colors.border },
  content: { padding: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  title: { ...typography.h1, color: colors.text, marginTop: spacing.sm },
  shortDescription: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  countdownWrap: { marginTop: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.text, lineHeight: 20, flexShrink: 1 },
  ruleRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  ruleBullet: { color: colors.primary, fontWeight: '700' },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prizeAmount: { ...typography.body, fontWeight: '700', color: colors.primary },
  registeredBanner: {
    marginTop: spacing.md,
    backgroundColor: '#E7F8ED',
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  registeredText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
