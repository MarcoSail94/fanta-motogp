// src/pages/CreateTeamPage.tsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeagueDetails, getRiders, createTeam } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import type { Rider } from '../types';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField,
  Grid,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
} from '@mui/material';
import {
  ExpandMore,
  Delete,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';


const categoryColors = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00',
  MOTO3: '#1976D2',
};

// REGOLE DI COMPOSIZIONE TEAM AGGIORNATE
const categoryRequirements = {
  MOTOGP: { min: 3, max: 3, label: 'MotoGP' },
  MOTO2: { min: 3, max: 3, label: 'Moto2' },
  MOTO3: { min: 3, max: 3, label: 'Moto3' },
};

export default function CreateTeamPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [teamName, setTeamName] = useState('');
  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | false>('MOTOGP');

  const { data: leagueData, isLoading: isLoadingLeague } = useQuery({
    queryKey: queryKeys.leagues.detail(leagueId),
    queryFn: () => getLeagueDetails(leagueId!),
  });

  const { data: ridersData, isLoading: isLoadingRiders } = useQuery<{ riders: Rider[] }>({
    queryKey: queryKeys.riders.all,
    queryFn: () => getRiders({ limit: 200 }),
  });

  const { mutate: createTeamMutation, isPending: isCreatingTeam } = useMutation({
    mutationFn: createTeam,
    onSuccess: (data: any) => {
      queryClient.setQueryData(queryKeys.teams.mine, (oldData: any) => ({
        ...oldData,
        teams: [...(oldData?.teams || []), data.team],
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(leagueId) });
      notify('Team creato con successo!', 'success');
      navigate(-1);
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Impossibile creare il team', 'error');
    },
  });

  const league = leagueData?.league;
  const riders = ridersData?.riders || [];
  const takenRiderIds = useMemo(() => new Set(
    leagueData?.league?.teams?.flatMap((team: any) => team.riders.map((r: any) => r.riderId)) || []
  ), [leagueData]);

  const selectedRidersData = useMemo(() => {
    return riders.filter(r => selectedRiders.includes(r.id));
  }, [riders, selectedRiders]);

  const totalCost = useMemo(() => {
    return selectedRidersData.reduce((sum, rider) => sum + rider.value, 0);
  }, [selectedRidersData]);

  const ridersByCategory = useMemo(() => {
    const grouped = riders.reduce((acc, rider) => {
      if (rider.riderType === 'OFFICIAL') {
        if (!acc[rider.category]) acc[rider.category] = [];
        acc[rider.category].push(rider);
      }
      return acc;
    }, {} as Record<string, Rider[]>);

    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => b.value - a.value);
    });

    return grouped;
  }, [riders]);

  const categoryStatus = useMemo(() => {
    const status: Record<string, { count: number; isValid: boolean }> = {};
    
    Object.entries(categoryRequirements).forEach(([category, req]) => {
      const count = selectedRidersData.filter(r => r.category === category).length;
      status[category] = {
        count,
        isValid: count >= req.min && count <= req.max,
      };
    });

    return status;
  }, [selectedRidersData]);

  const isTeamValid = useMemo(() => {
    return (
      teamName.trim().length >= 3 &&
      selectedRiders.length === 9 && // VALIDAZIONE AGGIORNATA
      totalCost <= (league?.budget || 0) &&
      Object.values(categoryStatus).every(s => s.isValid)
    );
  }, [teamName, selectedRiders, totalCost, league?.budget, categoryStatus]);

  const handleToggleRider = (rider: Rider) => {
    if (takenRiderIds.has(rider.id)) {
      notify('Questo pilota è già stato scelto da un altro team.', 'warning');
      return;
    }

    if (selectedRiders.includes(rider.id)) {
      setSelectedRiders(prev => prev.filter(id => id !== rider.id));
    } else {
      const categoryCount = selectedRidersData.filter(r => r.category === rider.category).length;
      const maxForCategory = categoryRequirements[rider.category as keyof typeof categoryRequirements].max;
      
      if(selectedRiders.length >= 9) {
        notify('Puoi selezionare al massimo 9 piloti.', 'warning');
        return;
      }
      
      if (categoryCount >= maxForCategory) {
        notify(`Puoi selezionare al massimo ${maxForCategory} piloti per la categoria ${rider.category}.`, 'warning');
        return;
      }
      
      if (totalCost + rider.value > (league?.budget || 0)) {
        notify('Budget non sufficiente per questo pilota.', 'error');
        return;
      }
      
      setSelectedRiders(prev => [...prev, rider.id]);
    }
  };

  const handleCreateTeam = () => {
    if (!isTeamValid || !leagueId) return;

    createTeamMutation({
      name: teamName.trim(),
      leagueId,
      riderIds: selectedRiders,
    });
  };

  if (isLoadingLeague || isLoadingRiders) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!league) {
    return <Alert severity="error">Lega non trovata</Alert>;
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Crea il tuo Team
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Lega: {league.name}
      </Typography>

      <Grid container spacing={3}>
        {/* Colonna sinistra: Form */}
        <Grid size={{ xs: 12, md: 8}}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                label="Nome del Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                margin="normal"
                error={teamName.length > 0 && teamName.length < 3}
                helperText={
                  teamName.length > 0 && teamName.length < 3
                    ? 'Il nome deve essere almeno 3 caratteri'
                    : ''
                }
              />
            </CardContent>
          </Card>

          {/* Selezione Piloti */}
          {Object.entries(ridersByCategory).map(([category, categoryRiders]) => {
            const req = categoryRequirements[category as keyof typeof categoryRequirements];
            const status = categoryStatus[category];

            return (
              <Accordion
                key={category}
                expanded={expandedCategory === category}
                onChange={(_, isExpanded) => setExpandedCategory(isExpanded ? category : false)}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    <Avatar
                      sx={{
                        bgcolor: categoryColors[category as keyof typeof categoryColors],
                        width: 32,
                        height: 32,
                      }}
                    >
                      {category.slice(-1)}
                    </Avatar>
                    <Typography sx={{ flexGrow: 1 }}>
                      {req.label} ({status.count}/{req.max})
                    </Typography>
                    {status.isValid ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Warning color="warning" />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {categoryRiders.map(rider => {
                      const isSelected = selectedRiders.includes(rider.id);
                      const isTaken = takenRiderIds.has(rider.id);
                      const wouldExceedBudget = !isSelected && totalCost + rider.value > league.budget;
                      const wouldExceedCategory = !isSelected && status.count >= req.max;
                      const isDisabled = isTaken || wouldExceedBudget || wouldExceedCategory;

                      return (
                        <ListItem
                          key={rider.id}
                          disablePadding 
                          secondaryAction={
                            <Checkbox
                              edge="end"
                              checked={isSelected}
                              disabled={isDisabled && !isSelected}
                              onChange={() => !isTaken && handleToggleRider(rider)}
                            />
                          }
                        >
                          <ListItemButton
                            onClick={() => !isTaken && handleToggleRider(rider)}
                            disabled={isDisabled && !isSelected}
                            selected={isSelected}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'grey.300' }}>{rider.number}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={rider.name}
                              secondary={
                                <Stack direction="row" spacing={1}>
                                  <Typography variant="caption">{rider.team}</Typography>
                                  <Typography variant="caption">•</Typography>
                                  <Typography variant="caption" color="primary">
                                    {rider.value} crediti
                                  </Typography>
                                  {isTaken && (
                                    <>
                                      <Typography variant="caption">•</Typography>
                                      <Typography variant="caption" color="error">
                                        Già preso
                                      </Typography>
                                    </>
                                  )}
                                </Stack>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Grid>

        {/* Colonna destra: Riepilogo */}
        <Grid size={{ xs: 12, md: 4}}>
          <Card sx={{ position: 'sticky', top: 16 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Riepilogo Team
              </Typography>

              {/* Budget */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Budget utilizzato</Typography>
                  <Typography variant="body2" color={totalCost > league.budget ? 'error' : 'primary'}>
                    {totalCost}/{league.budget} crediti
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(totalCost / league.budget) * 100}
                  color={totalCost > league.budget ? 'error' : 'primary'}
                />
              </Box>

              {/* Requisiti */}
              <Typography variant="subtitle2" gutterBottom>
                Requisiti Formazione
              </Typography>
              <Stack spacing={1} sx={{ mb: 3 }}>
                {Object.entries(categoryRequirements).map(([category, req]) => {
                  const status = categoryStatus[category];
                  return (
                    <Stack key={category} direction="row" justifyContent="space-between">
                      <Typography variant="body2">{req.label}</Typography>
                      <Chip
                        label={`${status.count}/${req.max}`}
                        size="small"
                        color={status.isValid ? 'success' : 'default'}
                      />
                    </Stack>
                  );
                })}
              </Stack>

              {/* Piloti selezionati */}
              <Typography variant="subtitle2" gutterBottom>
                Piloti Selezionati ({selectedRiders.length}/9)
              </Typography>
              <List dense>
                {selectedRidersData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nessun pilota selezionato
                  </Typography>
                ) : (
                  selectedRidersData.map(rider => (
                    <ListItem
                      key={rider.id}
                      dense
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleToggleRider(rider)}
                        >
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={rider.name}
                        secondary={`${rider.category} - ${rider.value} crediti`}
                      />
                    </ListItem>
                  ))
                )}
              </List>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleCreateTeam}
                disabled={!isTeamValid || isCreatingTeam}
                sx={{ mt: 3 }}
              >
                {isCreatingTeam ? 'Creazione in corso...' : 'Crea Team'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
