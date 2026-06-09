// webapp/src/pages/EditTeamPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getRiders, updateTeam } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import type { Rider } from '../types';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent,
  Button, Stack, Chip, LinearProgress, Avatar, List, ListItem, Grid,
  ListItemAvatar, ListItemText, ListItemSecondaryAction, ListItemButton,
  Accordion, AccordionSummary, AccordionDetails, Divider, Paper, Checkbox,
  TextField, InputAdornment,
} from '@mui/material';
import {
  ExpandMore, Save, Euro, Warning, CheckCircle, Search, ArrowBack
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { MobileActionBar } from '../components/ui/MobileActionBar';
import { PageHeader } from '../components/ui/PageHeader';


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

export default function EditTeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [teamName, setTeamName] = useState('');
  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | false>('MOTOGP');
  const [riderSearchQuery, setRiderSearchQuery] = useState('');

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: () => getTeamById(teamId!)
  });

  useEffect(() => {
    if (teamData?.team) {
      setSelectedRiders(teamData.team.riders.map((r: any) => r.riderId));
      setTeamName(teamData.team.name);
    }
  }, [teamData]); 

  const { data: ridersData, isLoading: loadingRiders } = useQuery({
    queryKey: queryKeys.riders.list,
    queryFn: () => getRiders({ limit: 200 }),
  });

  const team = teamData?.team;
  const league = team?.league;
  const allRiders = ridersData?.riders || [];
  
  const takenRiderIds = useMemo(() => {
    if (!league?.teams) return new Set<string>();
    const ids = new Set<string>();
    league.teams.forEach((t: any) => {
        if (t.id !== teamId) { // Escludi i piloti del team corrente
            t.riders.forEach((teamRider: any) => {
                ids.add(teamRider.riderId);
            });
        }
    });
    return ids;
  }, [league, teamId]);

  // Group riders by category
  const ridersByCategory = useMemo(() => {
    const normalizedSearch = riderSearchQuery.trim().toLowerCase();
    const grouped: Record<string, Rider[]> = {
      MOTOGP: [],
      MOTO2: [],
      MOTO3: [],
    };

    allRiders.forEach((rider: Rider) => {
        const matchesSearch =
          !normalizedSearch ||
          rider.name.toLowerCase().includes(normalizedSearch) ||
          rider.team.toLowerCase().includes(normalizedSearch);

        if (rider.riderType === 'OFFICIAL' && matchesSearch) {
            if (grouped[rider.category]) {
                grouped[rider.category].push(rider);
            }
        }
    });

    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => b.value - a.value);
    });

    return grouped;
  }, [allRiders, riderSearchQuery]);

  // Calculate selected riders data
  const selectedRidersData = useMemo(() => {
    return selectedRiders
      .map(id => allRiders.find((r: Rider) => r.id === id))
      .filter(Boolean) as Rider[];
  }, [selectedRiders, allRiders]);

  const selectedByCategory = useMemo(() => {
    return Object.keys(categoryRequirements).reduce((acc, category) => {
      acc[category] = selectedRidersData.filter((rider) => rider.category === category);
      return acc;
    }, {} as Record<string, Rider[]>);
  }, [selectedRidersData]);

  // Calculate budget
  const totalCost = selectedRidersData.reduce((sum, rider) => sum + rider.value, 0);
  const remainingBudget = (league?.budget || 0) - totalCost;

  // Check category requirements
  const categoryStatus = useMemo(() => {
    const status: Record<string, { count: number; isValid: boolean }> = {};

    Object.keys(categoryRequirements).forEach(category => {
      const count = selectedRidersData.filter(r => r.category === category).length;
      const req = categoryRequirements[category as keyof typeof categoryRequirements];
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

  // Mutation for updating team
  const updateTeamMutation = useMutation({
    mutationFn: (riderIds: string[]) => updateTeam(teamId!, { name: teamName.trim(), riderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
      notify('Team aggiornato con successo!', 'success');
      navigate(-1);
    },
    onError: (error: any) => {
        notify(error.response?.data?.error || 'Errore durante l\'aggiornamento del team', 'error');
    },
  });

  const handleToggleRider = (riderId: string) => {
    const rider = allRiders.find((r: Rider) => r.id === riderId);
    if (!rider) return;

    if (selectedRiders.includes(riderId)) {
      setSelectedRiders(prev => prev.filter(id => id !== riderId));
    } else {
      const categoryCount = selectedRidersData.filter(r => r.category === rider.category).length;
      const maxForCategory = categoryRequirements[rider.category as keyof typeof categoryRequirements].max;

      if (categoryCount >= maxForCategory) {
        notify(`Puoi selezionare massimo ${maxForCategory} piloti ${rider.category}`, 'warning');
        return;
      }

      if (selectedRiders.length >= 9) { // LIMITE AGGIORNATO
        notify('Puoi selezionare massimo 9 piloti', 'warning');
        return;
      }

      if (totalCost + rider.value > (league?.budget || 0)) {
        notify('Budget insufficiente per questo pilota', 'error');
        return;
      }

      setSelectedRiders(prev => [...prev, riderId]);
    }
  };

  const handleSaveTeam = () => {
    if (!isTeamValid) return;
    updateTeamMutation.mutate(selectedRiders);
  };

  if (loadingTeam || loadingRiders) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!team || !league) {
    return <Alert severity="error">Team non trovato</Alert>;
  }

  return (
    <Box className="fade-in" sx={{ pb: { xs: 20, md: 0 } }}>
      <PageHeader
        eyebrow="Garage"
        title={`Modifica ${team.name}`}
        subtitle={`Lega: ${league.name}. Aggiorna nome e mercato restando nei vincoli della rosa.`}
        actions={
          <Button
            variant="outlined"
            onClick={() => navigate('/teams')}
            startIcon={<ArrowBack />}
          >
            Team
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8}}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Nome del team"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    error={teamName.length > 0 && teamName.trim().length < 3}
                    helperText={teamName.length > 0 && teamName.trim().length < 3 ? 'Minimo 3 caratteri' : ' '}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Cerca pilota o team"
                    value={riderSearchQuery}
                    onChange={(e) => setRiderSearchQuery(e.target.value)}
                    helperText="Filtra il mercato mantenendo la selezione"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={900}>
                    Rosa attuale
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    3 piloti per categoria, 9 totali.
                  </Typography>
                </Box>
                <Chip
                  label={`${selectedRiders.length}/9`}
                  color={selectedRiders.length === 9 ? 'success' : 'default'}
                  sx={{ fontWeight: 900 }}
                />
              </Stack>

              <Grid container spacing={2}>
                {Object.entries(categoryRequirements).map(([category, req]) => (
                  <Grid key={category} size={{ xs: 12, sm: 4 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(255,255,255,0.1)',
                        bgcolor: 'background.default',
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography fontWeight={900} color={categoryColors[category as keyof typeof categoryColors]}>
                          {req.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedByCategory[category]?.length || 0}/{req.max}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.75}>
                        {Array.from({ length: req.max }).map((_, index) => {
                          const rider = selectedByCategory[category]?.[index];

                          return (
                            <Box
                              key={`${category}-${index}`}
                              sx={{
                                minHeight: 38,
                                borderRadius: 1.5,
                                border: '1px dashed',
                                borderColor: rider ? categoryColors[category as keyof typeof categoryColors] : 'rgba(255,255,255,0.14)',
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                gap: 1,
                              }}
                            >
                              {rider ? (
                                <>
                                  <Avatar
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      fontSize: '0.72rem',
                                      bgcolor: categoryColors[category as keyof typeof categoryColors],
                                    }}
                                  >
                                    {rider.number}
                                  </Avatar>
                                  <Typography variant="caption" fontWeight={800} noWrap>
                                    {rider.name}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Slot libero
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {Object.entries(categoryRequirements).map(([category, req]) => {
            const riders = ridersByCategory[category] || [];
            const status = categoryStatus[category];

            return (
              <Accordion
                key={category}
                expanded={expandedCategory === category}
                onChange={(_, isExpanded) => setExpandedCategory(isExpanded ? category : false)}
                sx={{ mb: 2, backgroundColor: 'background.paper' }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                    <Avatar
                      sx={{
                        bgcolor: categoryColors[category as keyof typeof categoryColors],
                        width: 40,
                        height: 40,
                      }}
                    >
                      {category.slice(-1)}
                    </Avatar>
                    <Typography sx={{ flexGrow: 1 }} variant="h6">
                      {req.label} ({status.count}/{req.max})
                    </Typography>
                    {status.isValid ? 
                      <CheckCircle color="success" /> : 
                      <Warning color="warning" />
                    }
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {riders.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Nessun pilota trovato per questa categoria.
                    </Typography>
                  ) : (
                  <List>
                    {riders.map((rider: Rider) => {
                      const isSelected = selectedRiders.includes(rider.id);
                      const isTaken = takenRiderIds.has(rider.id) && !isSelected;
                      const wouldExceedBudget = !isSelected && totalCost + rider.value > league.budget;
                      const wouldExceedCategory = !isSelected && status.count >= req.max;
                      const isDisabled = isTaken || wouldExceedBudget || wouldExceedCategory;

                      return (
                        <ListItem key={rider.id} disablePadding>
                          <ListItemButton
                            onClick={() => handleToggleRider(rider.id)}
                            disabled={isDisabled && !isSelected}
                            selected={isSelected}
                            sx={{ borderRadius: 1, mb: 1 }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: isTaken ? 'grey.700' : categoryColors[rider.category] }}>
                                {rider.number}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={rider.name}
                              secondary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2">{rider.team}</Typography>
                                  <Chip size="small" icon={<Euro sx={{ fontSize: 14 }} />} label={`${rider.value} crediti`} />
                                  {isTaken && <Chip label="Già preso" size="small" color="error" />}
                                </Stack>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Checkbox edge="end" checked={isSelected} disabled={isDisabled && !isSelected} readOnly />
                            </ListItemSecondaryAction>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Grid>

        {/* Riepilogo */}
        <Grid size={{ xs: 12, md: 4}}>
          <Card sx={{ position: { md: 'sticky' }, top: 80 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Riepilogo Modifiche
              </Typography>

              {/* Budget */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Budget utilizzato</Typography>
                  <Typography 
                    variant="body2" 
                    color={totalCost > league.budget ? 'error' : 'primary'}
                    fontWeight="bold"
                  >
                    {totalCost}/{league.budget} crediti
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(totalCost / league.budget) * 100}
                  color={totalCost > league.budget ? 'error' : 'primary'}
                />
                {remainingBudget < 0 && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    Superi il budget di {Math.abs(remainingBudget)} crediti
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Requisiti */}
              <Typography variant="subtitle2" gutterBottom>
                Requisiti Formazione
              </Typography>
              <Stack spacing={1} sx={{ mb: 3 }}>
                {Object.entries(categoryRequirements).map(([category, req]) => {
                  const status = categoryStatus[category];
                  return (
                    <Paper
                      key={category} 
                      sx={{ 
                        p: 1.5,
                        backgroundColor: status.isValid ? 'rgba(0,230,118,0.10)' : 'background.default',
                        border: '1px solid',
                        borderColor: status.isValid ? 'success.main' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{req.label}</Typography>
                        <Chip
                          label={`${status.count}/${req.max}`}
                          size="small"
                          color={status.isValid ? 'success' : 'default'}
                          icon={status.isValid ? <CheckCircle /> : undefined}
                        />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Piloti selezionati */}
              <Typography variant="subtitle2" gutterBottom>
                Piloti Selezionati ({selectedRiders.length}/9)
              </Typography>
              <List dense>
                {selectedRidersData.length === 0 ? (
                  <ListItem>
                    <ListItemText 
                      primary="Nessun pilota selezionato"
                      primaryTypographyProps={{ color: 'text.secondary', align: 'center' }}
                    />
                  </ListItem>
                ) : (
                  selectedRidersData.map(rider => (
                    <ListItem 
                      key={rider.id}
                      sx={{ 
                        backgroundColor: 'background.default',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: categoryColors[rider.category as keyof typeof categoryColors],
                            width: 32,
                            height: 32,
                            fontSize: 14,
                          }}
                        >
                          {rider.number}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={rider.name}
                        secondary={`${rider.category} - ${rider.value} crediti`}
                        primaryTypographyProps={{ fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                    </ListItem>
                  ))
                )}
              </List>

              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Save />}
                onClick={handleSaveTeam}
                disabled={!isTeamValid || updateTeamMutation.isPending}
                sx={{ mt: 3, display: { xs: 'none', md: 'inline-flex' } }}
              >
                {updateTeamMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <MobileActionBar
        label="Team"
        value={`${selectedRiders.length}/9 piloti`}
        helper={`${Math.max(0, remainingBudget)} crediti rimasti`}
        actionLabel="Salva"
        loadingLabel="Salvataggio..."
        onAction={handleSaveTeam}
        disabled={!isTeamValid || updateTeamMutation.isPending}
        loading={updateTeamMutation.isPending}
      />
    </Box>
  );
}
