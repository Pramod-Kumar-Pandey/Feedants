import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CompetitionApi } from '../api/competitionApi';

const POLL_INTERVAL_MS = 30000; // refresh spots/status periodically while screen is open

/**
 * Encapsulates all data-fetching/state logic for the details screen so the
 * component itself stays purely presentational.
 *
 * Design choices:
 * - We re-fetch full details after join/leave rather than optimistically
 *   mutating local state, because spotsLeft/status are values other users
 *   are concurrently changing — trusting the server's response after the
 *   mutation is the only way to avoid the UI drifting out of sync.
 * - Polling is paused when the app is backgrounded (AppState) to avoid
 *   wasting requests/battery, and resumed + immediately refreshed on
 *   foreground, since competition state is time-sensitive.
 */
export function useCompetitionDetails(competitionId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);

  const fetchDetails = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading((prev) => (data ? prev : true));
      setError(null);
      try {
        const result = await CompetitionApi.getDetails(competitionId);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load competition');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [competitionId, data]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetails({ silent: true });
  }, [fetchDetails]);

  const join = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await CompetitionApi.join(competitionId);
      await fetchDetails({ silent: true });
      return { success: true };
    } catch (err) {
      // Re-fetch even on failure: e.g. "competition full" means our view
      // was stale, so refresh to show the true current state.
      await fetchDetails({ silent: true });
      return { success: false, message: err.message };
    } finally {
      setActionLoading(false);
    }
  }, [competitionId, fetchDetails]);

  const leave = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await CompetitionApi.leave(competitionId);
      await fetchDetails({ silent: true });
      return { success: true };
    } catch (err) {
      await fetchDetails({ silent: true });
      return { success: false, message: err.message };
    } finally {
      setActionLoading(false);
    }
  }, [competitionId, fetchDetails]);

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  useEffect(() => {
    function startPolling() {
      stopPolling();
      pollRef.current = setInterval(() => fetchDetails({ silent: true }), POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
    }

    startPolling();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchDetails({ silent: true });
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  return { data, loading, refreshing, actionLoading, error, onRefresh, join, leave, refetch: fetchDetails };
}
