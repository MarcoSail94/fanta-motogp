// webapp/src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLatestRaceScoresStatus, getMyLeagues, getMyTeams, getUpcomingRaces } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  Add,
  ArrowForward,
  Assessment,
  EmojiEvents,
  Flag,
  Groups,
  SportsMotorsports,
  SportsScore,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ActionBanner } from '../components/ui/ActionBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';
import { getLineupDeadlineDate } from '../utils/raceDates';

export default function HomePage() {
  const navigate = useNavigate();

  const { data: racesData, isLoading: loadingRaces } = useQuery({
    queryKey: queryKeys.races.upcoming,
    queryFn: getUpcomingRaces,
  });
  const { data: scoresStatus } = useQuery({
    queryKey: queryKeys.races.latestScoresStatus,
    queryFn: getLatestRaceScoresStatus,
  });
  const { data: leaguesData, isLoading: loadingLeagues } = useQuery({
    queryKey: queryKeys.leagues.mine,
    queryFn: getMyLeagues,
  });
  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: queryKeys.teams.mine,
    queryFn: getMyTeams,
  });

  const nextRace = racesData?.races?.[0];
  const leagues = leaguesData?.leagues || [];
  const teams = teamsData?.teams || [];
  const isLoading = loadingRaces || loadingLeagues || loadingTeams;

  const targetDate = nextRace ? getLineupDeadlineDate(nextRace) : null;
  const isLocked = targetDate ? new Date() >= targetDate : false;
  const teamNeedingLineup = useMemo(
    () => teams.find((team: any) => !team.hasLineup),
    [teams]
  );
  const primaryTeam = teamNeedingLineup || teams[0];
  const bestLeaguePosition = useMemo(() => {
    const positions = leagues
      .map((league: any) => league.userPosition ?? league.position)
      .filter((position: unknown): position is number => typeof position === 'number' && position > 0)
      .sort((a: number, b: number) => a - b);

    return positions[0] ?? null;
  }, [leagues]);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!targetDate || isLocked) return;

    const updateCountdown = () => {
      const now = new Date();
      if (now >= targetDate) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      setTimeLeft({
        days: differenceInDays(targetDate, now),
        hours: differenceInHours(targetDate, now) % 24,
        minutes: differenceInMinutes(targetDate, now) % 60,
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [targetDate, isLocked]);

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant="rectangular" height={230} sx={{ borderRadius: 3 }} />
        </Grid>
        {[1, 2, 3, 4].map((item) => (
          <Grid key={item} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
    );
  }

  const handlePrimaryAction = () => {
    if (nextRace && primaryTeam && !isLocked) {
      navigate(`/teams/${primaryTeam.id}/lineup/${nextRace.id}`);
      return;
    }

    if (nextRace) {
      navigate(`/races/${nextRace.id}`);
      return;
    }

    navigate('/calendar');
  };

  return (
    <Box className="fade-in">
      <PageHeader
        eyebrow="Race control"
        title="Dashboard"
        subtitle="Tieni sotto controllo prossima gara, formazioni e stato delle tue leghe."
        actions={
          <Button variant="outlined" startIcon={<Add />} onClick={() => navigate('/leagues')}>
            Leghe
          </Button>
        }
      />

      <Stack spacing={2.5}>
        {scoresStatus?.hasNewScores && (
          <ActionBanner
            tone="success"
            icon={<Assessment />}
            title="Fanta punteggi aggiornati"
            description={
              <>
                I punteggi del <strong>{scoresStatus.lastRaceName}</strong> sono disponibili.
              </>
            }
            actionLabel={leagues.length === 1 ? 'Vedi classifica' : 'Vedi team'}
            onAction={() => {
              if (leagues.length === 1) {
                navigate(`/leagues/${leagues[0].id}`);
              } else {
                navigate('/teams');
              }
            }}
          />
        )}

        <Paper
          sx={{
            p: { xs: 2.5, md: 3 },
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(230,0,35,0.28)',
            background: (theme) => `
              linear-gradient(135deg, ${theme.palette.primary.dark}66 0%, rgba(15,15,19,0.96) 58%),
              radial-gradient(circle at 92% 12%, rgba(255,107,0,0.18), transparent 28%)
            `,
          }}
        >
          <SportsScore
            sx={{
              position: 'absolute',
              right: { xs: -54, md: -24 },
              top: { xs: -38, md: -64 },
              fontSize: { xs: 210, md: 320 },
              opacity: 0.08,
              transform: 'rotate(12deg)',
            }}
          />

          <Grid container spacing={3} alignItems="center" sx={{ position: 'relative' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip
                  label={nextRace ? `Round ${nextRace.round}` : `Stagione ${new Date().getFullYear()}`}
                  color="secondary"
                  size="small"
                />
                {teamNeedingLineup && nextRace && !isLocked && (
                  <Chip label="Lineup da completare" color="warning" size="small" />
                )}
                {isLocked && <Chip label="Formazioni bloccate" color="error" size="small" />}
              </Stack>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  fontSize: { xs: '2rem', md: '3.25rem' },
                }}
              >
                {nextRace ? nextRace.name : 'Calendario in arrivo'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1, mb: 3, fontSize: { md: '1.05rem' } }}>
                {nextRace
                  ? `${nextRace.circuit}, ${nextRace.country}`
                  : 'Appena la stagione sara disponibile, la prossima azione comparira qui.'}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={handlePrimaryAction}
                >
                  {nextRace && primaryTeam && !isLocked
                    ? teamNeedingLineup
                      ? 'Schiera formazione'
                      : 'Aggiorna formazione'
                    : 'Vai alla gara'}
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/teams')}>
                  I miei team
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper
                sx={{
                  p: 2.5,
                  border: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(15,15,19,0.56)',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
                  <AccessTime fontSize="small" color={isLocked ? 'error' : 'primary'} />
                  <Typography variant="overline" color={isLocked ? 'error.main' : 'text.secondary'} fontWeight={900}>
                    {isLocked ? 'Gara in corso' : 'Deadline formazione'}
                  </Typography>
                </Stack>

                {isLocked ? (
                  <Stack spacing={1} alignItems="center" sx={{ py: 1.5 }}>
                    <Flag color="error" />
                    <Typography variant="h5" color="error.main" fontWeight={900}>
                      Formazioni bloccate
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Segui la gara e attendi il calcolo dei punteggi.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack
                    direction="row"
                    justifyContent="center"
                    spacing={2}
                    divider={<Typography variant="h4" sx={{ opacity: 0.24 }}>:</Typography>}
                  >
                    <Box textAlign="center">
                      <Typography variant="h3" fontWeight={900}>{Math.max(0, timeLeft.days)}</Typography>
                      <Typography variant="caption" color="text.secondary">GIORNI</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h3" fontWeight={900}>{Math.max(0, timeLeft.hours)}</Typography>
                      <Typography variant="caption" color="text.secondary">ORE</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary.main" fontWeight={900}>
                        {Math.max(0, timeLeft.minutes)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">MIN</Typography>
                    </Box>
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricTile label="Leghe" value={leagues.length} helper="attive" icon={<Groups />} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricTile label="Team" value={teams.length} helper="gestiti" icon={<SportsMotorsports />} tone="secondary" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricTile
              label="Lineup"
              value={nextRace ? teams.filter((team: any) => team.hasLineup).length : '-'}
              helper={nextRace ? `su ${teams.length} per il round` : 'nessuna gara'}
              icon={<SportsScore />}
              tone={teamNeedingLineup ? 'warning' : 'success'}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <MetricTile
              label="Miglior piazzamento"
              value={bestLeaguePosition ? `#${bestLeaguePosition}` : '-'}
              helper={bestLeaguePosition ? 'posizione lega' : 'nessuna classifica'}
              icon={<EmojiEvents />}
              tone="warning"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={900}>Le mie leghe</Typography>
                <Button size="small" onClick={() => navigate('/leagues')}>Vedi tutte</Button>
              </Stack>

              {leagues.length > 0 ? (
                <Stack spacing={1.5}>
                  {leagues.slice(0, 4).map((league: any) => (
                    <Box
                      key={league.id}
                      onClick={() => navigate(`/leagues/${league.id}`)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        border: '1px solid rgba(255,255,255,0.08)',
                        transition: 'border-color 0.2s ease, transform 0.2s ease',
                        '&:hover': { borderColor: 'primary.main', transform: 'translateX(4px)' },
                      }}
                    >
                      <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', fontWeight: 900 }}>
                        {league.name.charAt(0)}
                      </Avatar>
                      <Box flexGrow={1} minWidth={0}>
                        <Typography fontWeight={800} noWrap>{league.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {league.currentTeams}/{league.maxTeams} partecipanti
                        </Typography>
                      </Box>
                      {(league.userPosition ?? league.position) && (
                        <Chip
                          icon={<EmojiEvents sx={{ fontSize: 16 }} />}
                          label={`${league.userPosition ?? league.position}`}
                          color={(league.userPosition ?? league.position) <= 3 ? 'warning' : 'default'}
                          size="small"
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  icon={<Groups sx={{ fontSize: 52 }} />}
                  title="Non sei ancora in nessuna lega"
                  description="Crea una lega o entra con un codice per iniziare il campionato."
                  actionLabel="Esplora leghe"
                  onAction={() => navigate('/leagues')}
                />
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={900}>Stato team</Typography>
                <Button size="small" onClick={() => navigate('/teams')}>Gestisci</Button>
              </Stack>

              {teams.length > 0 ? (
                <Stack spacing={1.5}>
                  {teams.slice(0, 3).map((team: any) => {
                    const needsLineup = !team.hasLineup && nextRace && !isLocked;

                    return (
                      <Box
                        key={team.id}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: needsLineup ? 'warning.main' : 'rgba(255,255,255,0.08)',
                          borderRadius: 2,
                          bgcolor: 'background.default',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box minWidth={0}>
                            <Typography fontWeight={800} noWrap>{team.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {team.league.name}
                            </Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="h6" color="primary.main" fontWeight={900}>
                              {team.totalPoints || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">punti</Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                          <Chip
                            size="small"
                            color={needsLineup ? 'warning' : 'success'}
                            variant={needsLineup ? 'filled' : 'outlined'}
                            label={needsLineup ? 'Lineup mancante' : 'Lineup ok'}
                          />
                          {nextRace && !isLocked && (
                            <Button
                              size="small"
                              variant={needsLineup ? 'contained' : 'outlined'}
                              color={needsLineup ? 'warning' : 'primary'}
                              onClick={() => navigate(`/teams/${team.id}/lineup/${nextRace.id}`)}
                            >
                              {needsLineup ? 'Schiera' : 'Modifica'}
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <EmptyState
                  icon={<SportsMotorsports sx={{ fontSize: 52 }} />}
                  title="Nessun team"
                  description="Unisciti a una lega e crea il tuo primo team."
                  actionLabel="Trova una lega"
                  onAction={() => navigate('/leagues')}
                />
              )}
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
