// webapp/src/hooks/useRealTimeUpdates.ts
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../contexts/NotificationContext';
import { queryKeys } from '../services/queryKeys';
import type { RealtimeEndpoint } from '../services/queryKeys';

interface RealTimeConfig {
  enabled?: boolean;
  pollingInterval?: number;
  endpoints?: RealtimeEndpoint[];
}

const DEFAULT_ENDPOINTS: RealtimeEndpoint[] = ['leagues', 'races', 'lineups'];

export function useRealTimeUpdates(config: RealTimeConfig = {}) {
  const {
    enabled = true,
    pollingInterval = 30000, // 30 secondi default
    endpoints = DEFAULT_ENDPOINTS
  } = config;

  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const invalidateEndpoint = useCallback((endpoint: RealtimeEndpoint) => {
    switch (endpoint) {
      case 'leagues':
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.mine });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.public });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.root });
        break;
      case 'league-lineups':
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.lineupsRoot });
        break;
      case 'races':
        queryClient.invalidateQueries({ queryKey: queryKeys.races.allRoot });
        queryClient.invalidateQueries({ queryKey: queryKeys.races.upcoming });
        queryClient.invalidateQueries({ queryKey: queryKeys.races.root });
        queryClient.invalidateQueries({ queryKey: queryKeys.races.resultsRoot });
        queryClient.invalidateQueries({ queryKey: queryKeys.races.qualifyingRoot });
        queryClient.invalidateQueries({ queryKey: queryKeys.races.practiceRoot });
        break;
      case 'lineups':
        queryClient.invalidateQueries({ queryKey: queryKeys.lineups.root });
        break;
      case 'teams':
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.mine });
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.root });
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.myInLeagueRoot });
        break;
      case 'riders':
        queryClient.invalidateQueries({ queryKey: queryKeys.riders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.riders.list });
        queryClient.invalidateQueries({ queryKey: queryKeys.riders.detailRoot });
        break;
    }
  }, [queryClient]);

  const checkForUpdates = useCallback(async () => {
    endpoints.forEach(invalidateEndpoint);
  }, [endpoints, invalidateEndpoint]);

  useEffect(() => {
    if (!enabled) return;

    // Setup polling
    const interval = setInterval(checkForUpdates, pollingInterval);

    // Listener per eventi custom
    const handleRaceUpdate = (event: CustomEvent) => {
      notify(`Aggiornamento gara: ${event.detail.raceName}`, 'info');
      invalidateEndpoint('races');
    };

    const handleLineupDeadline = (event: CustomEvent) => {
      notify(`Deadline formazione in scadenza per ${event.detail.raceName}!`, 'warning');
    };

    const handleLeagueUpdate = (event: CustomEvent) => {
      invalidateEndpoint('leagues');
    };

    // Aggiungi listener
    window.addEventListener('race-update', handleRaceUpdate as EventListener);
    window.addEventListener('lineup-deadline', handleLineupDeadline as EventListener);
    window.addEventListener('league-update', handleLeagueUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('race-update', handleRaceUpdate as EventListener);
      window.removeEventListener('lineup-deadline', handleLineupDeadline as EventListener);
      window.removeEventListener('league-update', handleLeagueUpdate as EventListener);
    };
  }, [enabled, pollingInterval, checkForUpdates, notify, invalidateEndpoint]);

  // Funzione per trigger manuale refresh
  const forceRefresh = useCallback(() => {
    checkForUpdates();
    notify('Dati aggiornati', 'success');
  }, [checkForUpdates, notify]);

  return { forceRefresh };
}
