// webapp/src/pages/LineupPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getLineup, setLineup, getRaceById, getRaceResults, getQualifyingResults } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { useNotification } from '../contexts/NotificationContext';
import {
  Box, Typography, Grid, Paper, Button, Avatar, IconButton, InputBase,
  Chip, Stack, Card, CardActionArea, Skeleton, Tooltip, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { AccessTime, Add, CheckCircle, Remove, Save } from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MobileActionBar } from '../components/ui/MobileActionBar';
import { PageHeader } from '../components/ui/PageHeader';
import { getLineupDeadlineDate } from '../utils/raceDates';

// Helper per categoria
const CATEGORIES = ['MOTOGP', 'MOTO2', 'MOTO3'];
const CAT_COLORS: Record<string, string> = { MOTOGP: '#E60023', MOTO2: '#FF6B00', MOTO3: '#1976D2' };
const SESSIONS = [
  { id: 'QUALIFYING', label: 'Q' },
  { id: 'FP2', label: 'FP2' },
  { id: 'PR', label: 'PR' },
  { id: 'FP1', label: 'FP1' }
];
const MIN_POSITION = 1;
const MAX_POSITION = 30;

type SortMode = 'form' | 'number';

interface SessionResult {
  id: string;
  label: string;
  position: number | null;
  text: string;
}

function formatCountdown(deadline: Date, now: Date) {
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return 'Schieramento chiuso';
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `chiude tra ${days}g ${hours}h`;
  if (hours > 0) return `chiude tra ${hours}h ${minutes % 60}m`;
  return `chiude tra ${minutes}m`;
}

// Selettore della posizione prevista: −/+ comodi col pollice, ma si può anche scrivere il numero
function PositionStepper({ value, onChange, status }: {
  value: string;
  onChange: (value: string) => void;
  status: 'ok' | 'missing' | 'duplicate';
}) {
  const numeric = parseInt(value);
  const step = (delta: number) => {
    const base = isNaN(numeric) ? (delta > 0 ? MIN_POSITION - 1 : MIN_POSITION + 1) : numeric;
    onChange(String(Math.min(MAX_POSITION, Math.max(MIN_POSITION, base + delta))));
  };
  const borderColor = status === 'missing' ? 'error.main' : status === 'duplicate' ? 'warning.main' : 'rgba(255,255,255,0.2)';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor, borderRadius: 1, flexShrink: 0 }}>
      <IconButton size="small" aria-label="Posizione precedente" onClick={() => step(-1)} disabled={numeric <= MIN_POSITION}>
        <Remove fontSize="small" />
      </IconButton>
      <InputBase
        value={value}
        placeholder="–"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
        inputProps={{
          inputMode: 'numeric',
          'aria-label': 'Posizione prevista',
          style: { width: 26, textAlign: 'center', fontWeight: 800, padding: 0 }
        }}
      />
      <IconButton size="small" aria-label="Posizione successiva" onClick={() => step(1)} disabled={numeric >= MAX_POSITION}>
        <Add fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default function LineupPage() {
  const { teamId, raceId } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  // State locale per il lineup: { riderId: { selected: boolean, pos: string } }
  const [selection, setSelection] = useState<Record<string, { selected: boolean; pos: string }>>({});
  const [sortMode, setSortMode] = useState<SortMode>('form');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: teamData, isLoading: l1 } = useQuery({ queryKey: queryKeys.teams.detail(teamId), queryFn: () => getTeamById(teamId!) });
  const { data: raceData, isLoading: l2 } = useQuery({ queryKey: queryKeys.races.detail(raceId), queryFn: () => getRaceById(raceId!) });
  const { data: lineupData, isLoading: l3 } = useQuery({ queryKey: queryKeys.lineups.detail(teamId, raceId), queryFn: () => getLineup(teamId!, raceId!) });

  // Fetch dei risultati delle sessioni precedenti
  const { data: raceResultsData } = useQuery({ 
    queryKey: queryKeys.races.results(raceId),
    queryFn: () => getRaceResults(raceId!), 
    enabled: !!raceId 
  });
  
  const { data: qualiResultsData } = useQuery({ 
    queryKey: queryKeys.races.qualifying(raceId),
    queryFn: () => getQualifyingResults(raceId!), 
    enabled: !!raceId 
  });

  // Inizializzazione dati esistenti
  useEffect(() => {
    if (lineupData?.lineup?.lineupRiders) {
      const newSelection: any = {};
      lineupData.lineup.lineupRiders.forEach((lr: any) => {
        newSelection[lr.riderId] = { selected: true, pos: lr.predictedPosition?.toString() || '' };
      });
      setSelection(newSelection);
    }
  }, [lineupData]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => setLineup(raceId!, data),
    onSuccess: () => {
      notify('Formazione salvata con successo!', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.root });
      navigate(-1);
    },
    onError: (err: any) => notify(err.response?.data?.error || 'Errore nel salvataggio.', 'error')
  });

  const team = teamData?.team;
  const riders = team?.riders?.map((tr: any) => tr.rider) || [];
  
  const stats = useMemo(() => {
    const counts = { MOTOGP: 0, MOTO2: 0, MOTO3: 0, total: 0 };
    let errors: string[] = [];
    
    Object.entries(selection).forEach(([id, val]) => {
      if (val.selected) {
        const rider = riders.find((r: any) => r.id === id);
        if (rider) counts[rider.category as keyof typeof counts]++;
        counts.total++;
        
        // Check posizione
        const p = parseInt(val.pos);
        if (!val.pos || isNaN(p) || p < MIN_POSITION || p > MAX_POSITION) errors.push(`Posizione mancante per ${rider?.name}`);
      }
    });

    if (counts.MOTOGP !== 2) errors.push('Devi selezionare 2 piloti MotoGP');
    if (counts.MOTO2 !== 2) errors.push('Devi selezionare 2 piloti Moto2');
    if (counts.MOTO3 !== 2) errors.push('Devi selezionare 2 piloti Moto3');

    return { counts, valid: errors.length === 0 && counts.total === 6, errors };
  }, [selection, riders]);

  if (l1 || l2 || l3) return (
    <Box p={4}>
        <Skeleton variant="text" height={60} width="40%" sx={{mb: 2}} />
        <Grid container spacing={3}>
            {[1,2,3].map(i => <Grid size={{ xs: 12, md: 4}} key={i}><Skeleton variant="rectangular" height={500} sx={{borderRadius: 2}}/></Grid>)}
        </Grid>
    </Box>
  );

  const handleToggle = (riderId: string, category: string) => {
    const isSelected = selection[riderId]?.selected;
    
    if (!isSelected) {
      const currentCatCount = Object.keys(selection).filter(id => 
        selection[id].selected && riders.find((r:any) => r.id === id)?.category === category
      ).length;
      
      if (currentCatCount >= 2) {
        notify(`Hai già selezionato 2 piloti per ${category}`, 'warning');
        return;
      }
    }

    setSelection(prev => {
      if (isSelected) {
         const newState = { ...prev };
         delete newState[riderId];
         return newState;
      }
      return { ...prev, [riderId]: { selected: true, pos: prev[riderId]?.pos || '' } };
    });
  };

  const handlePosChange = (riderId: string, val: string) => {
    setSelection(prev => ({
      ...prev,
      [riderId]: { selected: true, pos: val }
    }));
  };

  // Risultati del pilota nelle sessioni del weekend: posizione se classificato, altrimenti lo status (DNS, DNF...)
  const getRiderSessionResults = (riderId: string, category: string): SessionResult[] =>
    SESSIONS.flatMap(session => {
      const results = session.id === 'QUALIFYING'
        ? qualiResultsData?.results?.[category] || []
        : raceResultsData?.results?.[session.id]?.[category] || [];
      const res = results.find((r: any) => r.riderId === riderId);
      if (!res) return [];
      if (res.position) return [{ ...session, position: res.position, text: `${res.position}°` }];
      if (res.status && res.status !== 'FINISHED') return [{ ...session, position: null, text: res.status }];
      return [];
    });

  const getBestPosition = (results: SessionResult[]) => {
    const positions = results.map(r => r.position).filter((p): p is number => p !== null);
    return positions.length > 0 ? Math.min(...positions) : null;
  };

  // Forma weekend: prima chi ha il miglior risultato tra Q, FP2, PR e FP1, poi chi non ne ha
  const sortRiders = (categoryRiders: any[], category: string) => {
    if (sortMode === 'number') return [...categoryRiders].sort((a, b) => a.number - b.number);
    return [...categoryRiders].sort((a, b) => {
      const bestA = getBestPosition(getRiderSessionResults(a.id, category)) ?? Number.POSITIVE_INFINITY;
      const bestB = getBestPosition(getRiderSessionResults(b.id, category)) ?? Number.POSITIVE_INFINITY;
      return bestA !== bestB ? bestA - bestB : a.number - b.number;
    });
  };

  // Altri piloti della stessa categoria con la stessa posizione prevista (consentito, ma probabilmente una svista)
  const getDuplicateRiders = (riderId: string, category: string) => {
    const pos = selection[riderId]?.pos;
    if (!pos) return [];
    return riders.filter((r: any) =>
      r.id !== riderId && r.category === category && selection[r.id]?.selected && selection[r.id]?.pos === pos
    );
  };

  const renderSessionPositions = (riderId: string, category: string) => {
    const results = getRiderSessionResults(riderId, category);
    if (results.length === 0) return null;
    const best = getBestPosition(results);

    return (
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap' }}>
        {results.map(result => {
          const isBest = result.position !== null && result.position === best;
          const notClassified = result.position === null;
          return (
            <Tooltip title={isBest ? `${result.id} · miglior risultato del weekend` : result.id} key={result.id}>
              <Chip
                label={`${result.label} ${result.text}`}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  height: 22,
                  bgcolor: isBest ? 'rgba(0,230,118,0.14)' : 'rgba(255,255,255,0.06)',
                  color: isBest ? 'success.main' : notClassified ? 'error.main' : 'text.secondary',
                  '& .MuiChip-label': { px: 0.9 }
                }}
              />
            </Tooltip>
          );
        })}
      </Stack>
    );
  };

  const handleSaveLineup = () => {
    saveMutation.mutate({
      teamId,
      riders: Object.keys(selection).filter(k => selection[k].selected).map(k => ({
        riderId: k,
        predictedPosition: parseInt(selection[k].pos),
      })),
    });
  };

  const race = raceData?.race;
  const deadline = race ? getLineupDeadlineDate(race) : null;
  const isClosed = deadline ? now >= deadline : false;
  const duplicateCount = riders.filter((r: any) =>
    selection[r.id]?.selected && getDuplicateRiders(r.id, r.category).length > 0
  ).length;
  const readyHelper = duplicateCount > 0
    ? `Pronta · ${duplicateCount} piloti con posizione ripetuta`
    : 'Pronta per il salvataggio';

  return (
    <Box className="fade-in" sx={{ pb: { xs: 20, md: 0 } }}>
      <PageHeader
        eyebrow="Lineup"
        title="Schiera formazione"
        subtitle={`${team?.name} - ${raceData?.race?.name}`}
      />

      {/* Header Sticky */}
      <Paper className="liquid-glass-nav" sx={{
        p: 2, mb: 3, position: 'sticky', top: 10, zIndex: 100, 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderRadius: 3
      }} elevation={4}>
        <Box>
           <Typography variant="subtitle2" color="text.secondary">{team?.name}</Typography>
           <Stack direction="row" spacing={2} alignItems="center">
             <Typography variant="h6" fontWeight="bold">{raceData?.race?.name}</Typography>
             <Chip 
                label={`${stats.counts.total}/6 Selezionati`} 
                color={stats.counts.total === 6 ? 'success' : 'warning'} 
                size="small" 
                variant="outlined"
             />
           </Stack>
           {deadline && (
             <Box sx={{ mt: 0.5 }}>
               <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: isClosed ? 'error.main' : 'warning.main' }}>
                 <AccessTime sx={{ fontSize: 16 }} />
                 <Typography variant="body2" fontWeight={800} color="inherit">
                   {formatCountdown(deadline, now)}
                 </Typography>
               </Stack>
               <Typography variant="caption" color="text.secondary">
                 Deadline {format(deadline, 'EEEE d MMM, HH:mm', { locale: it })} (inizio {race?.sprintDate ? 'Sprint' : 'gara'})
               </Typography>
             </Box>
           )}
           <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
             {CATEGORIES.map((cat) => (
               <Chip
                 key={cat}
                 size="small"
                 label={`${cat} ${stats.counts[cat as keyof typeof stats.counts]}/2`}
                 color={stats.counts[cat as keyof typeof stats.counts] === 2 ? 'success' : 'default'}
                 variant="outlined"
               />
             ))}
           </Stack>
           {stats.errors.length > 0 && (
               <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                  {stats.errors[0]} {stats.errors.length > 1 && `(+${stats.errors.length - 1} altri)`}
               </Typography>
           )}
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Save />} 
          disabled={!stats.valid || saveMutation.isPending}
          onClick={handleSaveLineup}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
        >
          Salva
        </Button>
      </Paper>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Ordina per</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={sortMode}
          onChange={(_, value: SortMode | null) => value && setSortMode(value)}
          aria-label="Ordinamento piloti"
        >
          <ToggleButton value="form">Forma weekend</ToggleButton>
          <ToggleButton value="number">Numero</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Griglia Piloti per Categoria */}
      <Grid container spacing={3}>
        {CATEGORIES.map(cat => {
          const catRiders = sortRiders(riders.filter((r:any) => r.category === cat), cat);
          return (
            <Grid size={{ xs: 12, md: 4}} key={cat}>
              <Paper sx={{ 
                  p: 2, height: '100%', 
                  borderTop: `4px solid ${CAT_COLORS[cat]}`,
                  bgcolor: 'background.paper'
              }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" sx={{ color: CAT_COLORS[cat], fontWeight: 'bold' }}>
                    {cat}
                  </Typography>
                  <Chip 
                    label={`${stats.counts[cat as keyof typeof stats.counts]}/2`} 
                    size="small" 
                    color={stats.counts[cat as keyof typeof stats.counts] === 2 ? "success" : "default"}
                  />
                </Box>

                <Stack spacing={2}>
                  {catRiders.map((rider:any) => {
                    const isSelected = selection[rider.id]?.selected;
                    const pos = selection[rider.id]?.pos || '';
                    const missingPosition = Boolean(isSelected && !pos);
                    const duplicates = isSelected ? getDuplicateRiders(rider.id, cat) : [];
                    
                    return (
                      <Card 
                        key={rider.id} 
                        variant="outlined"
                        sx={{ 
                          borderColor: isSelected ? CAT_COLORS[cat] : 'rgba(255,255,255,0.1)',
                          bgcolor: isSelected ? `${CAT_COLORS[cat]}11` : 'transparent',
                          transition: 'all 0.2s',
                          borderWidth: isSelected ? '2px' : '1px'
                        }}
                      >
                          <Box p={{ xs: 1, sm: 1.5 }} display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
                            
                            <CardActionArea 
                              onClick={() => handleToggle(rider.id, cat)}
                              sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, p: 1, borderRadius: 1, overflow: 'hidden' }}
                            >
                              <Avatar sx={{ bgcolor: isSelected ? CAT_COLORS[cat] : 'grey.700', fontWeight: 'bold', width: 32, height: 32, fontSize: 14 }}>
                                {rider.number}
                              </Avatar>
                              
                              <Box flexGrow={1} sx={{ minWidth: 0 }}>
                                <Typography fontWeight="bold" variant="body2" noWrap>{rider.name}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{rider.team}</Typography>
                                {renderSessionPositions(rider.id, cat)}
                              </Box>
                              
                              {isSelected && <CheckCircle sx={{ ml: 'auto', color: CAT_COLORS[cat], fontSize: 20, display: { xs: 'none', sm: 'block' } }} />}
                            </CardActionArea>

                            {isSelected && (
                              <PositionStepper
                                value={pos}
                                onChange={(value) => handlePosChange(rider.id, value)}
                                status={missingPosition ? 'missing' : duplicates.length > 0 ? 'duplicate' : 'ok'}
                              />
                            )}
                          </Box>
                          {(missingPosition || duplicates.length > 0) && (
                            <Typography
                              variant="caption"
                              color={missingPosition ? 'error.main' : 'warning.main'}
                              sx={{ display: 'block', px: { xs: 2, sm: 2.5 }, pb: 1, mt: -0.5 }}
                            >
                              {missingPosition
                                ? 'Imposta la posizione prevista'
                                : `Posizione ${pos} già usata da ${duplicates.map((d: any) => d.name).join(', ')}`}
                            </Typography>
                          )}
                      </Card>
                    )
                  })}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <MobileActionBar
        label="Lineup"
        value={`${stats.counts.total}/6 piloti`}
        helper={stats.errors[0] || readyHelper}
        actionLabel="Salva"
        loadingLabel="Salvataggio..."
        onAction={handleSaveLineup}
        disabled={!stats.valid || saveMutation.isPending}
        loading={saveMutation.isPending}
      />
    </Box>
  );
}
