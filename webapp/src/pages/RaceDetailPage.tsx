// webapp/src/pages/RaceDetailPage.tsx
import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getQualifyingResults, getRaceById, getRaceResults, triggerRaceDataRefresh } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CalendarToday,
  EmojiEvents,
  Flag,
  LocationOn,
  SportsScore,
  Speed,
  Timer,
  WorkspacePremium,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Sync,
} from '@mui/icons-material';
import { differenceInCalendarDays, format, isAfter, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { EmptyState } from '../components/ui/EmptyState';
import { MetricTile } from '../components/ui/MetricTile';
import { getGpDate, getSprintDate } from '../utils/raceDates';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

type Category = 'MOTOGP' | 'MOTO2' | 'MOTO3';
type RaceSession = 'race' | 'sprint' | 'qualifying' | 'fp1' | 'fp2' | 'pr';

interface RaceResult {
  rider: {
    id: string;
    name: string;
    number: number;
    team: string;
    category: string;
  };
  position: number | null;
  status: string;
  points?: number;
  time?: string;
  gap?: string;
  totalLaps?: number;
  bestLap?: {
    time: string;
    number?: number;
  };
}

const CATEGORIES: Category[] = ['MOTOGP', 'MOTO2', 'MOTO3'];
const SESSION_OPTIONS: Array<{ value: RaceSession; label: string; icon?: ReactNode; sprintOnly?: boolean }> = [
  { value: 'race', label: 'Gara', icon: <SportsScore fontSize="small" /> },
  { value: 'sprint', label: 'Sprint', icon: <Speed fontSize="small" />, sprintOnly: true },
  { value: 'qualifying', label: 'Qualifiche', icon: <Timer fontSize="small" /> },
  { value: 'pr', label: 'PR' },
  { value: 'fp2', label: 'FP2' },
  { value: 'fp1', label: 'FP1' },
];

const categoryColors: Record<Category, string> = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00',
  MOTO3: '#1976D2',
};

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  return (
    <Box role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </Box>
  );
}

function isRaceOrSprint(session: RaceSession) {
  return session === 'race' || session === 'sprint';
}

function getWeekendStatus(race: any) {
  const now = new Date();
  const startDate = new Date(race.startDate);
  const endDate = new Date(race.endDate);

  if (isAfter(now, endDate)) return { label: 'Conclusa', color: 'default' as const };
  if (isAfter(now, startDate) && isBefore(now, endDate)) return { label: 'Weekend live', color: 'error' as const };

  const days = differenceInCalendarDays(startDate, now);
  if (days === 0) return { label: 'Oggi', color: 'warning' as const };
  if (days === 1) return { label: 'Domani', color: 'warning' as const };
  return { label: `${Math.max(0, days)} giorni`, color: 'success' as const };
}

function podiumColor(position: number | null) {
  if (position === 1) return '#FFD700';
  if (position === 2) return '#C0C0C0';
  if (position === 3) return '#CD7F32';
  return 'primary.main';
}

function resultPositionLabel(result: RaceResult) {
  if (result.status && result.status !== 'FINISHED') return result.status;
  return result.position ?? '-';
}

function FilterButton({
  selected,
  children,
  accent = '#E60023',
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        width: '100%',
        minWidth: 0,
        minHeight: 42,
        px: 1,
        py: 0.75,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: selected ? `${accent}CC` : 'rgba(255,255,255,0.15)',
        backgroundImage: selected
          ? `linear-gradient(135deg, ${accent}30, rgba(255,255,255,0.08)), radial-gradient(circle at 18% 0%, rgba(255,255,255,0.22), transparent 36%)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.035)), radial-gradient(circle at 18% 0%, rgba(255,255,255,0.14), transparent 36%)',
        bgcolor: selected ? `${accent}18` : 'rgba(18,18,25,0.58)',
        backdropFilter: 'blur(18px) saturate(170%)',
        WebkitBackdropFilter: 'blur(18px) saturate(170%)',
        boxShadow: selected
          ? `0 12px 28px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.16)`
          : 'inset 0 1px 0 rgba(255,255,255,0.08)',
        color: selected ? 'text.primary' : 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        font: 'inherit',
        fontWeight: selected ? 900 : 700,
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': {
          borderColor: `${accent}CC`,
          bgcolor: `${accent}18`,
          boxShadow: `0 10px 24px ${accent}1F, inset 0 1px 0 rgba(255,255,255,0.14)`,
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
        '& svg': {
          fontSize: 18,
          flexShrink: 0,
        },
      }}
    >
      {children}
    </Box>
  );
}

function SessionFilter({
  value,
  onChange,
  hasSprint,
}: {
  value: RaceSession;
  onChange: (value: RaceSession) => void;
  hasSprint: boolean;
}) {
  const options = SESSION_OPTIONS.filter((option) => !option.sprintOnly || hasSprint);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(6, minmax(0, 1fr))' },
        gap: 1,
      }}
    >
      {options.map((option) => (
        <FilterButton
          key={option.value}
          selected={value === option.value}
          accent={option.value === 'race' ? '#E60023' : option.value === 'sprint' ? '#FF6B00' : '#FFFFFF'}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <Typography variant="caption" fontWeight="inherit" noWrap>
            {option.label}
          </Typography>
        </FilterButton>
      ))}
    </Box>
  );
}

function CategoryFilter({
  value,
  onChange,
}: {
  value: Category;
  onChange: (value: Category) => void;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
      {CATEGORIES.map((category) => (
        <FilterButton
          key={category}
          selected={value === category}
          accent={categoryColors[category]}
          onClick={() => onChange(category)}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: categoryColors[category],
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" fontWeight="inherit" noWrap>
            {category}
          </Typography>
        </FilterButton>
      ))}
    </Box>
  );
}

function PodiumStrip({ results }: { results: RaceResult[] }) {
  const podium = results
    .filter((result) => typeof result.position === 'number' && result.position <= 3)
    .sort((a, b) => (a.position || 99) - (b.position || 99));

  if (podium.length === 0) return null;

  return (
    <Grid container spacing={1.5} sx={{ mb: 3 }}>
      {podium.map((result) => (
        <Grid key={result.rider.id} size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 1.75,
              height: '100%',
              border: '1px solid',
              borderColor: `${podiumColor(result.position)}66`,
              background: `linear-gradient(135deg, ${podiumColor(result.position)}22, rgba(26,26,35,0.92) 70%)`,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <WorkspacePremium sx={{ color: podiumColor(result.position), fontSize: 34 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={800}>
                  P{result.position}
                </Typography>
                <Typography fontWeight={900} noWrap>
                  {result.rider.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {result.rider.team}
                </Typography>
              </Box>
              <Typography variant="h6" color="primary.main" fontWeight={900} sx={{ ml: 'auto' }}>
                {result.points ?? 0}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function MobileResultCard({
  result,
  selectedSession,
  expanded,
  onToggle,
}: {
  result: RaceResult;
  selectedSession: RaceSession;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isPodium = typeof result.position === 'number' && result.position <= 3;
  const isDNF = result.status !== 'FINISHED';
  const showPoints = isRaceOrSprint(selectedSession);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      sx={{
        borderLeft: isPodium ? 4 : 0,
        borderColor: isPodium ? podiumColor(result.position) : 'transparent',
        backgroundColor: isDNF ? 'rgba(255, 0, 0, 0.05)' : 'background.paper',
        cursor: 'pointer',
        outline: 'none',
        '&:focus-visible': {
          boxShadow: '0 0 0 2px rgba(230,0,35,0.7)',
        },
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 34, display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {isPodium && <EmojiEvents sx={{ fontSize: 18, color: podiumColor(result.position) }} />}
            <Typography variant="body2" fontWeight={900} color={isDNF ? 'error.main' : 'text.primary'}>
              {resultPositionLabel(result)}
            </Typography>
          </Box>
          <Avatar sx={{ width: 26, height: 26, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
            {result.rider.number}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={800} noWrap>
              {result.rider.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.2 }}>
              {result.rider.team} · {result.time || result.gap || result.bestLap?.time || '-'}
              {showPoints ? ` · ${result.totalLaps || '-'} giri` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {showPoints && (
              <Chip
                label={`${result.points || 0} pt`}
                size="small"
                color={result.points ? 'primary' : 'default'}
                sx={{ height: 22, fontWeight: 800, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
            {expanded ? (
              <KeyboardArrowUp sx={{ fontSize: 20, color: 'text.secondary' }} />
            ) : (
              <KeyboardArrowDown sx={{ fontSize: 20, color: 'text.secondary' }} />
            )}
          </Stack>
        </Stack>
        {isDNF && (
          <Typography variant="caption" color="error.main" sx={{ pl: 5.5, display: 'block', lineHeight: 1.2 }}>
            {result.status}
          </Typography>
        )}

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 1 }} />
          <Grid container spacing={1}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">Team</Typography>
              <Typography variant="body2" fontWeight={700} noWrap>{result.rider.team}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">Stato</Typography>
              <Typography variant="body2" fontWeight={700} color={isDNF ? 'error.main' : 'text.primary'}>
                {result.status || 'FINISHED'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                {showPoints ? 'Tempo/Gap' : 'Giro veloce'}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {result.time || result.gap || result.bestLap?.time || '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                {showPoints ? 'Giri' : 'Giro'}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {showPoints ? (result.totalLaps || '-') : (result.bestLap?.number || '-')}
              </Typography>
            </Grid>
            {showPoints && (
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Punti</Typography>
                <Typography variant="body2" fontWeight={900} color="primary.main">
                  {result.points || 0}
                </Typography>
              </Grid>
            )}
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">Numero</Typography>
              <Typography variant="body2" fontWeight={700}>
                #{result.rider.number}
              </Typography>
            </Grid>
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category>('MOTOGP');
  const [selectedSession, setSelectedSession] = useState<RaceSession>('race');
  const [expandedResultKey, setExpandedResultKey] = useState<string | null>(null);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [recalculateScores, setRecalculateScores] = useState(true);

  const { data: raceData, isLoading: loadingRace } = useQuery({
    queryKey: queryKeys.races.detail(raceId),
    queryFn: () => getRaceById(raceId!),
    enabled: !!raceId,
  });

  const { data: raceResultsData, isLoading: loadingRaceResults } = useQuery({
    queryKey: queryKeys.races.results(raceId),
    queryFn: () => getRaceResults(raceId!),
    enabled: !!raceId && !!raceData,
  });

  const { data: qualifyingData, isLoading: loadingQualifying } = useQuery({
    queryKey: queryKeys.races.qualifying(raceId),
    queryFn: () => getQualifyingResults(raceId!),
    enabled: !!raceId && !!raceData && selectedSession === 'qualifying',
  });

  const { data: practiceData, isLoading: loadingPractice } = useQuery({
    queryKey: queryKeys.races.practice(raceId, selectedSession),
    queryFn: () => getRaceResults(raceId!, selectedSession as 'fp1' | 'fp2' | 'pr'),
    enabled: !!raceId && !!raceData && (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr'),
  });

  const categoryResults: RaceResult[] = useMemo(() => {
    if (selectedSession === 'qualifying') {
      return qualifyingData?.results?.[selectedCategory] || [];
    }

    if (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr') {
      const sessionKey = selectedSession.toUpperCase() as 'FP1' | 'FP2' | 'PR';
      return practiceData?.results?.[sessionKey]?.[selectedCategory] || [];
    }

    const sessionKey = selectedSession.toUpperCase() as 'RACE' | 'SPRINT';
    return raceResultsData?.results?.[sessionKey]?.[selectedCategory] || [];
  }, [selectedSession, selectedCategory, raceResultsData, qualifyingData, practiceData]);

  const loadingResults = selectedSession === 'qualifying'
    ? loadingQualifying
    : (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr')
    ? loadingPractice
    : loadingRaceResults;

  const refreshMutation = useMutation({
    mutationFn: () => triggerRaceDataRefresh(raceId!, {
      recalculateScores,
      clearExistingResults: true,
    }),
    onSuccess: (data) => {
      notify(data?.message || 'Refresh dati avviato', 'success');
      setRefreshDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.races.detail(raceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.races.results(raceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.races.qualifying(raceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.races.practiceRoot });
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore durante l\'avvio del refresh dati', 'error');
    },
  });

  if (loadingRace) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!raceData?.race) {
    return <Alert severity="error">Gara non trovata</Alert>;
  }

  const race = raceData.race;
  const gpDate = getGpDate(race);
  const sprintDate = getSprintDate(race);
  const hasSprint = !!sprintDate;
  const weekendStatus = getWeekendStatus(race);

  return (
    <Box className="fade-in" sx={{ pb: 2 }}>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mb: 2,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(230,0,35,0.28)',
          background: `
            linear-gradient(135deg, rgba(230,0,35,0.50), rgba(15,15,19,0.98) 58%),
            radial-gradient(circle at 90% 8%, rgba(255,107,0,0.24), transparent 28%)
          `,
        }}
      >
        {race.trackLayoutUrl && (
          <Box
            sx={{
              position: 'absolute',
              right: { xs: -70, md: 16 },
              top: { xs: 16, md: -6 },
              width: { xs: 220, md: 320 },
              height: { xs: 180, md: 250 },
              backgroundImage: `url(${race.trackLayoutUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'contain',
              opacity: 0.1,
            }}
          />
        )}

        <Grid container spacing={2} alignItems="center" sx={{ position: 'relative' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Chip label={`Round ${race.round}`} color="secondary" size="small" />
              <Chip label={weekendStatus.label} color={weekendStatus.color} size="small" />
            </Stack>
            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              sx={{ fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.02 }}
            >
              {race.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <LocationOn fontSize="small" color="primary" />
              <Typography color="text.secondary">
                {race.circuit}, {race.country}
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack
              direction={{ xs: 'row', md: 'column' }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Chip
                icon={<CalendarToday />}
                label={format(gpDate, 'dd MMMM yyyy', { locale: it })}
                sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'white' }}
              />
              {sprintDate && (
                <Chip
                  icon={<Speed />}
                  label={`Sprint ${format(sprintDate, 'dd MMM', { locale: it })}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'white' }}
                />
              )}
              {user?.isAdmin && (
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<Sync />}
                  onClick={() => setRefreshDialogOpen(true)}
                  sx={{ flexShrink: 0 }}
                >
                  Refresh dati
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Stagione" value={race.season} helper="campionato" icon={<Flag />} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="GP" value={format(gpDate, 'dd MMM', { locale: it })} helper="gara principale" icon={<SportsScore />} tone="secondary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Sprint" value={sprintDate ? format(sprintDate, 'dd MMM', { locale: it }) : '-'} helper={hasSprint ? 'weekend sprint' : 'non prevista'} icon={<Speed />} tone={hasSprint ? 'warning' : 'info'} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Risultati" value={categoryResults.length || '-'} helper={`${selectedSession.toUpperCase()} ${selectedCategory}`} icon={<EmojiEvents />} tone={categoryResults.length ? 'success' : 'primary'} />
        </Grid>
      </Grid>

      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab label="Risultati" />
          <Tab label="Info gara" />
          <Tab label="Statistiche" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={900}>
                Sessione
              </Typography>
              <SessionFilter
                value={selectedSession}
                onChange={(value) => {
                  setSelectedSession(value);
                  setExpandedResultKey(null);
                }}
                hasSprint={hasSprint}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={900}>
                Categoria
              </Typography>
              <CategoryFilter
                value={selectedCategory}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setExpandedResultKey(null);
                }}
              />
            </Grid>
          </Grid>

          {!isMobile && isRaceOrSprint(selectedSession) && <PodiumStrip results={categoryResults} />}

          {loadingResults ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : categoryResults.length > 0 ? (
            isMobile ? (
              <Stack spacing={1}>
                {categoryResults.map((result, index) => {
                  const resultKey = `${selectedSession}-${selectedCategory}-${result.rider.id}-${index}`;

                  return (
                    <MobileResultCard
                      key={resultKey}
                      result={result}
                      selectedSession={selectedSession}
                      expanded={expandedResultKey === resultKey}
                      onToggle={() => setExpandedResultKey((current) => current === resultKey ? null : resultKey)}
                    />
                  );
                })}
              </Stack>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table size={isTablet ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pos</TableCell>
                      <TableCell>Pilota</TableCell>
                      <TableCell>Team</TableCell>
                      {isRaceOrSprint(selectedSession) ? (
                        <>
                          <TableCell align="right">Tempo/Gap</TableCell>
                          <TableCell align="right">Giri</TableCell>
                          <TableCell align="right">Punti</TableCell>
                        </>
                      ) : (
                        <TableCell align="right">Giro veloce</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryResults.map((result, index) => {
                      const isPodium = typeof result.position === 'number' && result.position <= 3;
                      const isDNF = result.status !== 'FINISHED';

                      return (
                        <TableRow
                          key={`${result.rider.id}-${index}`}
                          sx={{
                            backgroundColor: isPodium ? `${podiumColor(result.position)}18` : 'inherit',
                            '&:hover': { backgroundColor: 'action.hover' },
                          }}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {isPodium && <EmojiEvents sx={{ color: podiumColor(result.position), fontSize: 20 }} />}
                              <Typography fontWeight={isPodium ? 900 : 600} color={isDNF ? 'error.main' : 'inherit'}>
                                {resultPositionLabel(result)}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                                {result.rider.number}
                              </Avatar>
                              <Typography fontWeight={800}>{result.rider.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {result.rider.team}
                            </Typography>
                          </TableCell>
                          {isRaceOrSprint(selectedSession) ? (
                            <>
                              <TableCell align="right">{result.time || result.gap || '-'}</TableCell>
                              <TableCell align="right">{result.totalLaps || '-'}</TableCell>
                              <TableCell align="right">
                                <Typography fontWeight={900} color="primary.main">
                                  {result.points || 0}
                                </Typography>
                              </TableCell>
                            </>
                          ) : (
                            <TableCell align="right">{result.bestLap?.time || '-'}</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            <EmptyState
              icon={<SportsScore sx={{ fontSize: 54 }} />}
              title="Risultati non disponibili"
              description={`Non ci sono ancora dati per ${selectedSession.toUpperCase()} ${selectedCategory}.`}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" fontWeight={900} gutterBottom>
                Dettagli circuito
              </Typography>
              <List>
                <ListItem>
                  <ListItemAvatar><Avatar><LocationOn /></Avatar></ListItemAvatar>
                  <ListItemText primary="Circuito" secondary={race.circuit} />
                </ListItem>
                <ListItem>
                  <ListItemAvatar><Avatar><Flag /></Avatar></ListItemAvatar>
                  <ListItemText primary="Paese" secondary={race.country} />
                </ListItem>
                <ListItem>
                  <ListItemAvatar><Avatar><CalendarToday /></Avatar></ListItemAvatar>
                  <ListItemText primary="Data GP" secondary={format(gpDate, 'dd MMMM yyyy', { locale: it })} />
                </ListItem>
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" fontWeight={900} gutterBottom>
                Weekend
              </Typography>
              <List>
                {[
                  ['FP1', 'Prime prove libere'],
                  ['PR', 'Prequalifiche'],
                  ['Q', 'Qualifiche'],
                  ...(hasSprint ? [['S', 'Sprint']] : []),
                  ['GP', 'Gara principale'],
                ].map(([label, text]) => (
                  <ListItem key={label}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: label === 'GP' ? 'primary.main' : 'secondary.main' }}>
                        {label}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={text} secondary={label === 'GP' ? format(gpDate, 'dd MMM HH:mm', { locale: it }) : 'Programma ufficiale weekend'} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2}>
            {CATEGORIES.map((category) => {
              const raceResults = raceResultsData?.results?.RACE?.[category] || [];
              const winner = raceResults.find((result: RaceResult) => result.position === 1);

              return (
                <Grid key={category} size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography fontWeight={900}>{category}</Typography>
                      <Chip size="small" label={`${raceResults.length} piloti`} />
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />
                    {winner ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <WorkspacePremium sx={{ color: '#FFD700' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={800} noWrap>{winner.rider.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Vincitore gara, {winner.points || 0} pt
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Statistiche disponibili dopo il caricamento risultati.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>
      </Card>

      <Dialog
        open={refreshDialogOpen}
        onClose={() => !refreshMutation.isPending && setRefreshDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Aggiorna dati gara</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning" variant="outlined">
              Verranno cancellati i risultati esistenti della gara e rilanciata la matrix di sync su GitHub Actions.
            </Alert>
            <FormControlLabel
              control={
                <Switch
                  checked={recalculateScores}
                  onChange={(event) => setRecalculateScores(event.target.checked)}
                />
              }
              label="Ricalcola giornata al termine"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefreshDialogOpen(false)} disabled={refreshMutation.isPending}>
            Annulla
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Sync />}
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? 'Avvio...' : 'Avvia refresh'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
