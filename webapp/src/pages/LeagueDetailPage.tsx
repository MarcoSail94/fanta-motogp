// webapp/src/pages/LeagueDetailPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Avatar, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
  CircularProgress, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, Switch, FormControlLabel, Select, MenuItem, FormControl,
  InputLabel, Stack, Divider, List, ListItem, ListItemText, ListItemAvatar,
  IconButton, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Remove, Groups, Settings, Share, Lock,
  ContentCopy, NotificationsActive, EmojiEvents, WorkspacePremium,
  BarChart, Refresh, SportsMotorsports, Timer, Info, Flag
} from '@mui/icons-material';
import { format, isPast, differenceInDays, differenceInHours } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  getLeagueDetails,
  getMyTeamInLeague,
  updateLeagueSettings,
  getLeagueRaceLineups,
  getAllRaces,
  getLineup
} from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ScoreBreakdownDialog } from '../components/ScoreBreakdownDialog';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { LeagueSeasonReset } from '../components/LeagueSeasonReset';
import { LeagueStatsTab } from '../components/league/LeagueStatsTab';
import { LeagueTabPanel } from '../components/league/LeagueTabPanel';
import { MobileStandingCard } from '../components/league/MobileStandingCard';
import { MetricTile } from '../components/ui/MetricTile';
import type { LeagueStanding } from '../components/league/MobileStandingCard';
import { getGpDate, getLineupDeadlineDate } from '../utils/raceDates';

function LeagueTabLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Stack spacing={0.35} alignItems="center" sx={{ minWidth: 0 }}>
      {icon}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          lineHeight: 1,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedTab, setSelectedTab] = useState(0);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<any>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const currentYear = new Date().getFullYear();

  // State per impostazioni lega
  const [teamsLocked, setTeamsLocked] = useState(false);
  const [lineupVisibility, setLineupVisibility] = useState('AFTER_DEADLINE');

  // Hook per real-time updates
  const { forceRefresh } = useRealTimeUpdates({
    enabled: true,
    endpoints: ['leagues', 'league-lineups'],
    pollingInterval: 30000
  });

  // Query dati lega
  const { data: leagueData, isLoading: loadingLeague, refetch: refetchLeague } = useQuery({
    queryKey: queryKeys.leagues.detail(leagueId),
    queryFn: () => getLeagueDetails(leagueId!),
    enabled: !!leagueId
  });

  // Query mio team nella lega
  const { data: myTeamData } = useQuery({
    queryKey: queryKeys.teams.myInLeague(leagueId),
    queryFn: () => getMyTeamInLeague(leagueId!),
    enabled: !!leagueId
  });

  // Query per tutte le gare della stagione
  const { data: racesData } = useQuery({
    queryKey: queryKeys.races.all(currentYear),
    queryFn: () => getAllRaces(currentYear),
  });

  // Query lineup per gara selezionata (per visualizzazione)
  const { data: lineupsData, isLoading: loadingLineups } = useQuery({
    queryKey: queryKeys.leagues.lineups(leagueId, selectedRaceId),
    queryFn: () => getLeagueRaceLineups(leagueId!, selectedRaceId!),
    enabled: !!leagueId && !!selectedRaceId
  });

  const allRaces = racesData?.races || [];
  const nextRace = allRaces.find((r: any) => !isPast(getGpDate(r)));
  const myTeam = myTeamData?.team;
  const deadline = nextRace ? getLineupDeadlineDate(nextRace) : null;

  // Controllo in tempo reale per lo stato di blocco (gara in corso)
  useEffect(() => {
    if (!deadline) return;
    const checkLocked = () => setIsLocked(new Date() >= deadline);
    checkLocked(); // Controllo iniziale
    const interval = setInterval(checkLocked, 60000); // Check ogni minuto
    return () => clearInterval(interval);
  }, [deadline]);

  const { data: nextRaceLineupData } = useQuery({
    queryKey: queryKeys.lineups.detail(myTeam?.id, nextRace?.id),
    queryFn: () => getLineup(myTeam!.id, nextRace!.id),
    enabled: !!myTeam && !!nextRace,
  });

  // Mutation per aggiornare settings
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => updateLeagueSettings(leagueId!, settings),
    onSuccess: () => {
      notify('Impostazioni aggiornate con successo', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(leagueId) });
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore aggiornamento impostazioni', 'error');
    }
  });

  // Inizializza settings da dati lega
  useEffect(() => {
    if (leagueData?.league) {
      setTeamsLocked(leagueData.league.teamsLocked || false);
      setLineupVisibility(leagueData.league.lineupVisibility || 'AFTER_DEADLINE');
    }
  }, [leagueData]);

  // Seleziona automaticamente la gara più recente o la prossima
  useEffect(() => {
    if (racesData?.races && !selectedRaceId) {
        const races = [...racesData.races].sort((a: any, b: any) => getGpDate(a).getTime() - getGpDate(b).getTime());
        const now = new Date();
        
        // Trova l'indice della prossima gara
        const nextRaceIndex = races.findIndex((race: any) => !isPast(getGpDate(race)));

        if (nextRaceIndex !== -1) {
            // Se c'è una gara imminente, controlla se quella precedente è appena finita
            const previousRaceIndex = nextRaceIndex - 1;
            if (previousRaceIndex >= 0) {
                const previousRace = races[previousRaceIndex];
                // Se la gara precedente è finita negli ultimi 3 giorni, la seleziona
                if (differenceInDays(now, getGpDate(previousRace)) <= 3) {
                    setSelectedRaceId(previousRace.id);
                    return;
                }
            }
            setSelectedRaceId(races[nextRaceIndex].id);
        } else if (races.length > 0) {
            // Se non ci sono gare imminenti, seleziona l'ultima gara della stagione
            setSelectedRaceId(races[races.length - 1].id);
        }
    }
  }, [racesData, selectedRaceId]);

  const league = leagueData?.league;
  const standings: LeagueStanding[] = league?.standings || [];
  const isAdmin = league?.isAdmin;
  const userHasTeam = !!myTeam;
  
  const daysUntilDeadline = deadline ? differenceInDays(deadline, new Date()) : null;
  const hoursUntilDeadline = deadline ? differenceInHours(deadline, new Date()) : null;

  // **LOGICA CORRETTA** per il banner, basata sulla query specifica per la prossima gara
  const hasLineupForNextRace = useMemo(() => {
    return !!nextRaceLineupData?.lineup?.lineupRiders?.length;
  }, [nextRaceLineupData]);

  // Calcola posizione utente
  const myPosition = standings.findIndex((s: any) => s.userId === user?.id) + 1;

  if (loadingLeague) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!league) {
    return <Alert severity="error">Lega non trovata</Alert>;
  }

  const handleCreateTeam = () => {
    navigate(`/leagues/${leagueId}/create-team`);
  };

  const handleManageLineup = () => {
    if (myTeam && nextRace) {
      navigate(`/teams/${myTeam.id}/lineup/${nextRace.id}`);
    }
  };

  const handleShareCode = () => {
    navigator.clipboard.writeText(league.code);
    notify('Codice lega copiato negli appunti!', 'success');
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      teamsLocked,
      lineupVisibility
    });
  };

  const handleShowScoreBreakdown = (lineup: any) => {
    setSelectedLineup(lineup);
    setShowScoreBreakdown(true);
  };

  const teamCount = league.teams?.length ?? league.currentTeams ?? 0;
  const hasLineupAction = nextRace && userHasTeam && !isLocked;
  const lineupMissing = Boolean(hasLineupAction && !hasLineupForNextRace);
  const deadlineValue = deadline
    ? isLocked
      ? 'Chiusa'
      : daysUntilDeadline && daysUntilDeadline > 0
      ? `${daysUntilDeadline}g`
      : `${Math.max(0, hoursUntilDeadline || 0)}h`
    : '-';
  const countdownLabel =
    daysUntilDeadline !== null && daysUntilDeadline > 0
      ? `${daysUntilDeadline} giorni`
      : hoursUntilDeadline !== null && hoursUntilDeadline > 0
      ? `${hoursUntilDeadline} ore`
      : 'In scadenza';

  return (
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      {/* Header Lega - Responsive */}
      <Paper
        className="liquid-glass-strong"
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2,
          overflow: 'hidden',
          position: 'relative',
          backgroundImage: `
            linear-gradient(135deg, rgba(230,0,35,0.34), rgba(18,18,25,0.78) 46%, rgba(255,255,255,0.04)),
            radial-gradient(circle at 92% 2%, rgba(255,107,0,0.20), transparent 30%)
          `,
          color: 'white',
          border: '1px solid rgba(230,0,35,0.30)',
        }}
      >
        <EmojiEvents
          sx={{
            position: 'absolute',
            right: { xs: -58, md: 20 },
            top: { xs: -56, md: -52 },
            fontSize: { xs: 190, md: 260 },
            opacity: 0.055,
            transform: 'rotate(10deg)',
          }}
        />
        <Grid container alignItems="flex-start" spacing={2} sx={{ position: 'relative' }}>
          <Grid size={{ xs: 12, md: 9 }}>
            <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.72, letterSpacing: 2 }}>
              Hub lega
            </Typography>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              sx={{ fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.04, mb: 1.5 }}
            >
              {league.name}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              useFlexGap
              sx={{
                '& .MuiChip-root': {
                  maxWidth: '100%',
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.14)',
                },
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            >
              <Chip
                icon={<ContentCopy sx={{ color: 'white !important' }} />}
                label={`Codice: ${league.code}`}
                onClick={handleShareCode}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  fontSize: isMobile ? '0.7rem' : '0.875rem',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
                }}
              />
              <Chip
                icon={<Groups sx={{ color: 'white !important' }} />}
                label={`${teamCount}/${league.maxTeams} team`}
                size={isMobile ? 'small' : 'medium'}
                sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
              />
              <Chip
                icon={<SportsMotorsports sx={{ color: 'white !important' }} />}
                label={userHasTeam ? `Team: ${myTeam.name}` : 'Team da creare'}
                size={isMobile ? 'small' : 'medium'}
                sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
              />
              {league.teamsLocked && (
                <Chip
                  icon={<Lock sx={{ color: 'white !important' }} />}
                  label="Team bloccati"
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    bgcolor: 'rgba(230,0,35,0.28) !important',
                    borderColor: 'rgba(230,0,35,0.45) !important',
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                  }}
                />
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Stack
              direction="row"
              spacing={1}
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              alignItems="center"
            >
              <Tooltip title="Aggiorna Dati">
                <IconButton
                  color="inherit"
                  onClick={() => forceRefresh()}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.20)' },
                  }}
                  size={isMobile ? 'small' : 'medium'}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Posizione"
            value={userHasTeam && myPosition > 0 ? `#${myPosition}` : '-'}
            helper={userHasTeam ? `${myTeam.totalPoints || 0} punti` : 'crea un team'}
            icon={<EmojiEvents />}
            tone="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Team"
            value={`${teamCount}/${league.maxTeams}`}
            helper={league.teamsLocked ? 'mercato chiuso' : 'posti lega'}
            icon={<Groups />}
            tone={league.teamsLocked ? 'error' : 'primary'}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Budget"
            value={league.budget}
            helper="crediti iniziali"
            icon={<SportsMotorsports />}
            tone="secondary"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Deadline"
            value={deadlineValue}
            helper={nextRace ? 'prossima gara' : 'nessuna gara'}
            icon={<Timer />}
            tone={isLocked ? 'error' : 'success'}
          />
        </Grid>
      </Grid>

      {/* Box Scadenza Gara - Responsive */}
      {nextRace && deadline && (
        <Paper
          className="liquid-glass-strong"
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 2,
            borderRadius: 3,
            borderColor: isLocked ? 'error.main' : 'rgba(255,255,255,0.16)',
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 1.8 }}>
                  Prossimo evento
                </Typography>
                <Typography
                  variant={isMobile ? 'h6' : 'h5'}
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.12,
                    textTransform: 'uppercase',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {nextRace.name}
                </Typography>
              </Box>
              <Chip
                label={
                  isLocked
                    ? 'Chiusa'
                    : hasLineupForNextRace
                    ? 'Lineup pronta'
                    : userHasTeam
                    ? 'Da schierare'
                    : 'Team mancante'
                }
                color={isLocked ? 'error' : hasLineupForNextRace ? 'success' : userHasTeam ? 'warning' : 'default'}
                size="small"
                sx={{ flexShrink: 0, fontWeight: 900 }}
              />
            </Stack>

            <Grid container spacing={1.25}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.055)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    Deadline schieramento
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Timer color={isLocked ? 'error' : 'primary'} fontSize="small" />
                    <Typography variant="body2" fontWeight={800}>
                      {format(deadline, isMobile ? 'dd MMM HH:mm' : 'eeee dd MMMM HH:mm', { locale: it })}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isLocked ? 'rgba(255,51,51,0.12)' : 'rgba(0,230,118,0.10)',
                    border: '1px solid',
                    borderColor: isLocked ? 'error.main' : 'success.main',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    Stato deadline
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    {isLocked ? <Flag color="error" fontSize="small" /> : <Timer color="success" fontSize="small" />}
                    <Typography variant="body2" fontWeight={900} color={isLocked ? 'error.main' : 'success.main'}>
                      {isLocked ? 'Gara in corso' : countdownLabel}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            {lineupMissing && (
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'rgba(41,121,255,0.12)',
                  border: '1px solid rgba(41,121,255,0.28)',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                }}
              >
                <Info color="info" fontSize="small" />
                <Typography variant="body2" color="info.light">
                  Lineup non ancora impostata per questa gara.
                </Typography>
              </Box>
            )}

            {!isLocked && (
              <Button
                variant="contained"
                onClick={userHasTeam ? handleManageLineup : handleCreateTeam}
                fullWidth={isMobile}
                size={isMobile ? 'medium' : 'large'}
              >
                {userHasTeam
                  ? hasLineupForNextRace
                    ? 'Aggiorna schieramento'
                    : 'Schiera'
                  : 'Crea team'}
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {/* Alert per utente senza team */}
      {!userHasTeam && !nextRace && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleCreateTeam}
            >
              Crea Team
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Non hai ancora un team in questa lega!
        </Alert>
      )}

      {/* Tabs - Responsive */}
      <Paper
        className="liquid-glass-nav"
        sx={{
          mb: 1.5,
          borderRadius: 3,
          overflow: 'hidden',
          position: { xs: 'sticky', md: 'static' },
          top: { xs: 76, md: 'auto' },
          zIndex: 95,
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          scrollButtons={false}
          sx={{
            '& .MuiTabs-flexContainer': {
              gap: 0,
            },
            '& .MuiTab-root': {
              minWidth: 0,
              minHeight: { xs: 64, sm: 58 },
              px: { xs: 0.5, sm: 2 },
              mx: 0.25,
              py: 1,
            },
          }}
        >
          <Tab
            label={<LeagueTabLabel icon={<EmojiEvents fontSize="small" />} label="Classifica" />}
          />
          <Tab
            label={<LeagueTabLabel icon={<SportsMotorsports fontSize="small" />} label="Lineup" />}
          />
          <Tab
            label={<LeagueTabLabel icon={<BarChart fontSize="small" />} label="Stats" />}
          />
          {isAdmin && (
            <Tab
              label={<LeagueTabLabel icon={<Settings fontSize="small" />} label="Admin" />}
            />
          )}
        </Tabs>
      </Paper>

      {/* Tab: Classifica - Responsive */}
      <LeagueTabPanel value={selectedTab} index={0}>
        {isMobile ? (
          // Layout Mobile - Cards
          <Box>
            {standings.map((standing: any, index: number) => {
              const position = index + 1;
              const isUserTeam = standing.userId === user?.id;
              const prevPoints = index > 0 ? standings[index - 1].totalPoints : null;
              const nextPoints = index < standings.length - 1 ? standings[index + 1].totalPoints : null;
              const gapPrev = prevPoints !== null ? standing.totalPoints - prevPoints : null;
              const gapNext = nextPoints !== null ? nextPoints - standing.totalPoints : null;

              return (
                <MobileStandingCard
                  key={standing.teamId}
                  standing={standing}
                  position={position}
                  isUserTeam={isUserTeam}
                  gapPrev={gapPrev}
                  gapNext={gapNext}
                />
              );
            })}
          </Box>
        ) : (
          // Layout Desktop - Tabella
          <TableContainer component={Paper}>
            <Table size={isTablet ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>Pos</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell align="right">Punti Totali</TableCell>
                  <TableCell align="right">Ultima Gara</TableCell>
                  <TableCell align="right">Gap Prec.</TableCell>
                  <TableCell align="right">Gap Succ.</TableCell>
                  <TableCell align="center">Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standings.map((standing: any, index: number) => {
                  const position = index + 1;
                  const isUserTeam = standing.userId === user?.id;
                  const prevPoints = index > 0 ? standings[index - 1].totalPoints : null;
                  const nextPoints = index < standings.length - 1 ? standings[index + 1].totalPoints : null;
                  const gapPrev = prevPoints !== null ? standing.totalPoints - prevPoints : null;
                  const gapNext = nextPoints !== null ? nextPoints - standing.totalPoints : null;

                  return (
                    <TableRow
                      key={standing.teamId}
                      sx={{
                        backgroundColor: isUserTeam ? 'action.selected' : 'inherit',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {position === 1 && <WorkspacePremium sx={{ color: '#FFD700' }} />}
                          {position === 2 && <WorkspacePremium sx={{ color: '#C0C0C0' }} />}
                          {position === 3 && <WorkspacePremium sx={{ color: '#CD7F32' }} />}
                          <Typography variant="h6">{position}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={isUserTeam ? 'bold' : 'normal'}>
                          {standing.teamName}
                        </Typography>
                      </TableCell>
                      <TableCell>{standing.userName}</TableCell>
                      <TableCell align="right">
                        <Typography variant="h6">{standing.totalPoints || 0}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {standing.lastRacePoints ? (
                          <Chip
                            label={`+${standing.lastRacePoints}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {gapPrev !== null ? (
                          <Typography variant="body2" color="error.main">
                            +{gapPrev}
                          </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {gapNext !== null ? (
                           <Typography variant="body2" color="success.main">
                           -{gapNext}
                         </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {standing.trend === 'up' && <TrendingUp color="success" />}
                        {standing.trend === 'down' && <TrendingDown color="error" />}
                        {standing.trend === 'same' && <Remove color="disabled" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </LeagueTabPanel>

      {/* Tab: Lineup Gara - Responsive */}
      <LeagueTabPanel value={selectedTab} index={1}>
        {/* Selettore Gara */}
        <Box mb={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>Seleziona Gara</InputLabel>
            <Select
              value={selectedRaceId || ''}
              onChange={(e) => setSelectedRaceId(e.target.value)}
              label="Seleziona Gara"
            >
              {allRaces?.map((race: any) => (
                <MenuItem key={race.id} value={race.id}>
                  {race.name} - {format(getGpDate(race), 'dd MMM', { locale: it })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loadingLineups ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={isMobile ? 2 : 3}>
            {lineupsData?.lineups?.map((teamLineup: any) => (
              <Grid key={teamLineup.teamId} size={{ xs: 12, md: 6}}>
                <Card>
                  <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            variant={isMobile ? "subtitle1" : "h6"}
                            fontWeight="bold"
                          >
                            {teamLineup.teamName}
                          </Typography>
                          {teamLineup.isFallback && (
                            <Tooltip title="Formazione applicata d'ufficio dalla gara precedente">
                              <Info color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography
                          variant={isMobile ? "caption" : "body2"}
                          color="text.secondary"
                        >
                          di {teamLineup.userName}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${teamLineup.totalPoints ?? 'N/D'} pt`}
                        color="primary"
                        size={isMobile ? "small" : "medium"}
                      />
                    </Box>
                    {teamLineup.lineup && teamLineup.lineup.length > 0 ? (
                      <>
                        <List dense sx={{ p: 0 }}>
                          {teamLineup.lineup.map((lr: any) => {
                            const riderScore = teamLineup.riderScores?.find(
                              (rs: any) => rs.rider === lr.rider.name
                            );
                            
                            return (
                              <ListItem key={lr.id} sx={{ px: 0 }}>
                                <ListItemAvatar>
                                  <Avatar
                                    sx={{
                                      bgcolor: 'primary.main',
                                      width: isMobile ? 28 : 32,
                                      height: isMobile ? 28 : 32,
                                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                                    }}
                                  >
                                    {lr.rider.number}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant={isMobile ? "body2" : "body1"}>
                                      {lr.rider.name}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box component="span">
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                                      >
                                        Prev: {lr.predictedPosition || '-'}°
                                        {riderScore && riderScore.actual && (
                                          <> | Arr: {typeof riderScore.actual === 'number' ? `${riderScore.actual}°` : riderScore.actual}</>
                                        )}
                                      </Typography>
                                    </Box>
                                  }
                                />
                                <Chip
                                  label={riderScore ? `${riderScore.points}` : '0'}
                                  size="small"
                                  variant={riderScore && riderScore.points ? "filled" : "outlined"}
                                  color={riderScore && riderScore.points ? "primary" : "default"}
                                  sx={{ 
                                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                                    fontWeight: riderScore && riderScore.points ? 'bold' : 'normal'
                                  }}
                                />
                              </ListItem>
                            );
                          })}
                        </List>

                        {teamLineup.riderScores && teamLineup.riderScores.length > 0 && (
                          <Button
                            size="small"
                            fullWidth
                            variant="outlined"
                            onClick={() => handleShowScoreBreakdown(teamLineup)}
                            startIcon={<BarChart />}
                            sx={{ mt: 2 }}
                          >
                            Analisi Punti
                          </Button>
                        )}
                      </>
                    ) : (
                      <Alert severity="info" variant="outlined">
                        Lineup non ancora impostato
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </LeagueTabPanel>

      {/* Tab: Statistiche - Responsive */}
      <LeagueTabPanel value={selectedTab} index={2}>
        <LeagueStatsTab leagueData={leagueData} league={league} isMobile={isMobile} />
      </LeagueTabPanel>

      {/* Tab: Gestione (solo per admin) - Responsive */}
      {isAdmin && (
        <LeagueTabPanel value={selectedTab} index={3}>
          <Grid container spacing={isMobile ? 2 : 3}>
            {/* Impostazioni Lega */}
            <Grid size={{ xs: 12, md: 6}}>
              <Card>
                <CardContent>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    gutterBottom
                    fontWeight="bold"
                  >
                    Impostazioni Lega
                  </Typography>

                  <Stack spacing={3}>
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={teamsLocked}
                            onChange={(e) => setTeamsLocked(e.target.checked)}
                            size={isMobile ? "small" : "medium"}
                          />
                        }
                        label={
                          <Typography variant={isMobile ? "body2" : "body1"}>
                            Blocca Modifiche Team
                          </Typography>
                        }
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        ml={isMobile ? 5 : 7}
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Impedisce ai membri di modificare i roster
                      </Typography>
                    </Box>

                    <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                      <InputLabel>Visibilità Lineup</InputLabel>
                      <Select
                        value={lineupVisibility}
                        onChange={(e) => setLineupVisibility(e.target.value)}
                        label="Visibilità Lineup"
                      >
                        <MenuItem value="ALWAYS_VISIBLE">Sempre Visibile</MenuItem>
                        <MenuItem value="AFTER_DEADLINE">Solo dopo deadline</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      size={isMobile ? "small" : "medium"}
                    >
                      {updateSettingsMutation.isPending ? 'Salvataggio...' : 'Salva'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Azioni Rapide */}
            <Grid size={{ xs: 12, md: 6}}>
              <Card>
                <CardContent>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    gutterBottom
                    fontWeight="bold"
                  >
                    Azioni Rapide
                  </Typography>

                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={handleShareCode}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    >
                      Condividi Codice
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<Groups />}
                      onClick={() => setShowInviteDialog(true)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    >
                      Invita Membri
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<NotificationsActive />}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                      disabled
                    >
                      Invia Notifica
                    </Button>

                    <Divider />

                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<Lock />}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                      disabled
                    >
                      Chiudi Iscrizioni
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* NUOVA SEZIONE: RESET STAGIONE */}
            <Grid size={12}>
               <LeagueSeasonReset 
                  leagueId={leagueId!} 
                  onResetComplete={refetchLeague} 
               />
            </Grid>

            {/* Info Lega */}
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    gutterBottom
                    fontWeight="bold"
                  >
                    Informazioni Lega
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Codice Lega
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.code}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Membri
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.currentTeams}/{league.maxTeams}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Budget
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.budget}€
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Lineup
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {lineupVisibility === 'ALWAYS_VISIBLE' ? 'Sempre visibili' : 'Dopo deadline'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </LeagueTabPanel>
      )}

      {/* Dialog Invita Membri - Responsive */}
      <Dialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Invita Membri</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Condividi questo codice con i tuoi amici per farli unire alla lega:
          </Typography>
          <Paper sx={{ p: 3, mt: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
            <Typography variant="h4" fontFamily="monospace">
              {league.code}
            </Typography>
          </Paper>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={handleShareCode}
            sx={{ mt: 2 }}
          >
            Copia Codice
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteDialog(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Score Breakdown Dialog */}
      <ScoreBreakdownDialog
        open={showScoreBreakdown}
        onClose={() => setShowScoreBreakdown(false)}
        lineupData={selectedLineup}
      />
    </Box>
  );
}
