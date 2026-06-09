// webapp/src/pages/RaceCalendarPage.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRaces } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import type { Race } from '../types';
import { Alert, Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { CalendarToday, Flag, SportsScore } from '@mui/icons-material';
import { isAfter, isBefore } from 'date-fns';
import { RaceEventCard } from '../components/RaceEventCard';
import { ActionBanner } from '../components/ui/ActionBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';

function raceBucket(race: Race, now: Date) {
  const startDate = new Date(race.startDate);
  const endDate = new Date(race.endDate);

  if (isAfter(now, endDate)) return 'Concluse';
  if (isAfter(now, startDate) && isBefore(now, endDate)) return 'In corso';
  return 'Future';
}

export default function RaceCalendarPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const { data: racesData, isLoading, error } = useQuery<{ races: Race[] }>({
    queryKey: queryKeys.races.all(currentYear),
    queryFn: () => getAllRaces(currentYear),
  });

  const races = useMemo(
    () => [...(racesData?.races || [])].sort((a, b) => a.round - b.round),
    [racesData]
  );

  const now = new Date();
  const nextRace = races.find((race) => raceBucket(race, now) !== 'Concluse');
  const groupedRaces = {
    'In corso': races.filter((race) => raceBucket(race, now) === 'In corso'),
    Future: races.filter((race) => raceBucket(race, now) === 'Future'),
    Concluse: races.filter((race) => raceBucket(race, now) === 'Concluse'),
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Errore nel caricamento del calendario.</Alert>;
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Stagione"
        title={`Calendario ${currentYear}`}
        subtitle="Una vista per orientarti velocemente tra round in corso, prossime gare e weekend conclusi."
      />

      {nextRace && (
        <Box sx={{ mb: 3 }}>
          <ActionBanner
            tone={raceBucket(nextRace, now) === 'In corso' ? 'error' : 'primary'}
            icon={raceBucket(nextRace, now) === 'In corso' ? <Flag /> : <SportsScore />}
            title={raceBucket(nextRace, now) === 'In corso' ? 'Weekend in corso' : 'Prossimo round'}
            description={`${nextRace.name} - ${nextRace.circuit}, ${nextRace.country}`}
            actionLabel="Dettagli gara"
            onAction={() => navigate(`/races/${nextRace.id}`)}
          />
        </Box>
      )}

      {races.length === 0 ? (
        <EmptyState
          icon={<CalendarToday sx={{ fontSize: 56 }} />}
          title="Nessuna gara disponibile"
          description={`Il calendario ${currentYear} non e ancora disponibile.`}
        />
      ) : (
        <Stack spacing={4}>
          {Object.entries(groupedRaces)
            .filter(([, sectionRaces]) => sectionRaces.length > 0)
            .map(([section, sectionRaces]) => (
              <Box key={section}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={900}>
                    {section}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {sectionRaces.length} round
                  </Typography>
                </Stack>

                <Grid container spacing={3} alignItems="stretch">
                  {sectionRaces.map((race) => (
                    <Grid key={race.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <RaceEventCard race={race} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
        </Stack>
      )}
    </Box>
  );
}
