// webapp/src/pages/LineupPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getLineup, setLineup, getRaceById, getRaceResults, getQualifyingResults } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import {
  Box, Typography, Grid, Paper, Button, Avatar, TextField, 
  Chip, Stack, Card, CardActionArea, Skeleton, Tooltip
} from '@mui/material';
import { CheckCircle, Save } from '@mui/icons-material';

// Helper per categoria
const CATEGORIES = ['MOTOGP', 'MOTO2', 'MOTO3'];
const CAT_COLORS: Record<string, string> = { MOTOGP: '#E60023', MOTO2: '#FF6B00', MOTO3: '#1976D2' };

export default function LineupPage() {
  const { teamId, raceId } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  // State locale per il lineup: { riderId: { selected: boolean, pos: string } }
  const [selection, setSelection] = useState<Record<string, { selected: boolean; pos: string }>>({});

  const { data: teamData, isLoading: l1 } = useQuery({ queryKey: ['team', teamId], queryFn: () => getTeamById(teamId!) });
  const { data: raceData, isLoading: l2 } = useQuery({ queryKey: ['race', raceId], queryFn: () => getRaceById(raceId!) });
  const { data: lineupData, isLoading: l3 } = useQuery({ queryKey: ['lineup', teamId, raceId], queryFn: () => getLineup(teamId!, raceId!) });

  // Fetch dei risultati delle sessioni precedenti
  const { data: raceResultsData } = useQuery({ 
    queryKey: ['raceResults', raceId], 
    queryFn: () => getRaceResults(raceId!), 
    enabled: !!raceId 
  });
  
  const { data: qualiResultsData } = useQuery({ 
    queryKey: ['qualiResults', raceId], 
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
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      queryClient.invalidateQueries({ queryKey: ['lineup'] });
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
        if (!val.pos || isNaN(p) || p < 1 || p > 30) errors.push(`Posizione mancante per ${rider?.name}`);
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

  // Helper per recuperare la posizione del pilota
  const getRiderPosition = (riderId: string, category: string, session: string) => {
    if (session === 'QUALIFYING') {
      const results = qualiResultsData?.results?.[category] || [];
      const res = results.find((r: any) => r.riderId === riderId);
      return res?.position;
    } else {
      const results = raceResultsData?.results?.[session]?.[category] || [];
      const res = results.find((r: any) => r.riderId === riderId);
      return res?.position;
    }
  };

  const renderSessionPositions = (riderId: string, category: string) => {
    const sessions = [
      { id: 'QUALIFYING', label: 'Q' },
      { id: 'FP2', label: 'FP2' },
      { id: 'PR', label: 'PR' },
      { id: 'FP1', label: 'FP1' }
    ];

    const hasAnySession = sessions.some(s => getRiderPosition(riderId, category, s.id));
    if (!hasAnySession) return null;

    return (
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
        {sessions.map(s => {
          const pos = getRiderPosition(riderId, category, s.id);
          if (!pos) return null;
          return (
            <Tooltip title={s.id} key={s.id}>
              <Chip 
                label={`${s.label}: ${pos}°`} 
                size="small" 
                variant="outlined" 
                sx={{ 
                  fontSize: '0.65rem', 
                  height: '20px', 
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'text.secondary',
                  '& .MuiChip-label': { px: 1 }
                }} 
              />
            </Tooltip>
          );
        })}
      </Stack>
    );
  };

  
  return (
    <Box className="fade-in">
      {/* Header Sticky */}
      <Paper sx={{ 
        p: 2, mb: 3, position: 'sticky', top: 10, zIndex: 100, 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(26, 26, 35, 0.9)',
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
          onClick={() => saveMutation.mutate({
             teamId, 
             riders: Object.keys(selection).filter(k => selection[k].selected).map(k => ({
               riderId: k, predictedPosition: parseInt(selection[k].pos)
             }))
          })}
        >
          Salva
        </Button>
      </Paper>

      {/* Griglia Piloti per Categoria */}
      <Grid container spacing={3}>
        {CATEGORIES.map(cat => {
          const catRiders = riders.filter((r:any) => r.category === cat);
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
                              <Box width={{ xs: 80, sm: 90 }} sx={{ flexShrink: 0, ml: { xs: 0, sm: 1 } }}>
                                <TextField
                                  label="Pos."
                                  size="small"
                                  type="number"
                                  variant="outlined"
                                  value={selection[rider.id]?.pos}
                                  onChange={(e) => handlePosChange(rider.id, e.target.value)}
                                  InputProps={{ sx: { borderRadius: 1 } }}
                                  InputLabelProps={{ sx: { fontSize: { xs: '0.8rem', sm: '1rem' } } }}
                                  inputProps={{ min: 1, max: 30, style: { textAlign: 'center', fontWeight: 'bold', padding: '8px 4px' } }}
                                  error={!selection[rider.id]?.pos}
                                />
                              </Box>
                            )}
                          </Box>
                      </Card>
                    )
                  })}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}