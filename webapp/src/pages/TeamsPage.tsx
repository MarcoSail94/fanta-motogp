// src/pages/TeamsPage.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyTeams, getUpcomingRaces } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, 
  CardActions, Grid, Button, Chip, Stack, Avatar, List, ListItem, ListItemAvatar, 
  ListItemText, IconButton, Tooltip, Paper, TextField, InputAdornment,
} from '@mui/material';
import {
  EmojiEvents, 
  SportsMotorsports,
  Groups,
  Edit,
  CalendarToday,
  Search,
  Lock,
  LockOpen,
  Flag
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { getLineupDeadlineDate } from '../utils/raceDates';

interface Team {
  id: string;
  name: string;
  league: {
    id: string;
    name: string;
    budget: number;
    code: string;
    isPrivate: boolean;
    teamsLocked: boolean;
  };
  riders: Array<{
    rider: {
      id: string;
      name: string;
      number: number;
      category: string;
      value: number;
    };
  }>;
  totalPoints?: number;
  remainingBudget: number;
  hasLineup?: boolean;
}

const categoryColors = {
  MOTOGP: '#FF6B00',
  MOTO2: '#1976D2',
  MOTO3: '#388E3C',
};

export default function TeamsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: queryKeys.teams.mine,
    queryFn: getMyTeams,
  });

  const { data: racesData } = useQuery({
    queryKey: queryKeys.races.upcoming,
    queryFn: getUpcomingRaces,
  });

  const teams: Team[] = teamsData?.teams || [];
  const nextRace = racesData?.races?.[0];
  const targetDate = nextRace ? getLineupDeadlineDate(nextRace) : null;

  // Calcolo in tempo reale se la gara è in corso
  useEffect(() => {
    if (!targetDate) return;
    const checkLocked = () => setIsLocked(new Date() >= targetDate);
    checkLocked(); // Controllo immediato
    const interval = setInterval(checkLocked, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, [targetDate]);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.league.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingTeams) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Garage"
        title="I miei team"
        subtitle="Gestisci rose, mercato e formazioni per i prossimi round."
      />

      {/* Prossima Gara */}
      {nextRace && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <CalendarToday />
              <Box>
                <Typography variant="h6">
                  Prossima Gara: {nextRace.name}
                </Typography>
                <Typography variant="body2">
                  {format(new Date(nextRace.gpDate), 'EEEE d MMMM yyyy', { locale: it })}
                </Typography>
              </Box>
            </Stack>
            {isLocked && (
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'error.main', px: 2, py: 0.5, borderRadius: 1 }}>
                 <Flag fontSize="small" />
                 <Typography variant="button" fontWeight="bold">
                   Gara in Corso
                 </Typography>
               </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Barra di ricerca */}
      <TextField
        fullWidth
        placeholder="Cerca team o lega..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Lista Team */}
      {filteredTeams.length === 0 ? (
        <EmptyState
          icon={<SportsMotorsports sx={{ fontSize: 64 }} />}
          title={searchQuery ? 'Nessun team trovato' : 'Non hai ancora creato nessun team'}
          description={searchQuery ? 'Prova con una ricerca diversa.' : 'Unisciti a una lega per iniziare a giocare.'}
          actionLabel={!searchQuery ? 'Esplora leghe' : undefined}
          onAction={!searchQuery ? () => navigate('/leagues') : undefined}
        />
      ) : (
        <Grid container spacing={3}>
          {filteredTeams.map((team) => (
            <Grid key={team.id} size={{ xs: 12, md: 6}}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {team.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<Groups />}
                          label={team.league.name}
                          size="small"
                          onClick={() => navigate(`/leagues/${team.league.id}`)}
                        />
                        {team.league.teamsLocked ? (
                          <Chip
                            icon={<Lock />}
                            label="Mercato chiuso"
                            size="small"
                            color="error"
                          />
                        ) : (
                          <Chip
                            icon={<LockOpen />}
                            label="Mercato aperto"
                            size="small"
                            color="success"
                          />
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {!team.league.teamsLocked && (
                        <Tooltip title="Modifica team">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/teams/${team.id}/edit`)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>

                  {/* Statistiche */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 4}}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="primary">
                          {team.totalPoints || 0}
                        </Typography>
                        <Typography variant="caption">Punti Totali</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4}}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="secondary">
                          {team.riders.length}
                        </Typography>
                        <Typography variant="caption">Piloti</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4}}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="success.main">
                          {team.remainingBudget}
                        </Typography>
                        <Typography variant="caption">Crediti</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Lista Piloti */}
                  <Typography variant="subtitle2" gutterBottom>
                    Piloti:
                  </Typography>
                  <List dense disablePadding>
                    {team.riders
                      .sort((a, b) => {
                        const categoryOrder = { MOTOGP: 0, MOTO2: 1, MOTO3: 2 };
                        return categoryOrder[a.rider.category as keyof typeof categoryOrder] - 
                               categoryOrder[b.rider.category as keyof typeof categoryOrder];
                      })
                      .map(({ rider }) => (
                        <ListItem key={rider.id} disablePadding>
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: categoryColors[rider.category as keyof typeof categoryColors],
                                width: 32,
                                height: 32,
                              }}
                            >
                              {rider.number}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={rider.name}
                            secondary={`${rider.category} - ${rider.value} crediti`}
                          />
                        </ListItem>
                      ))}
                  </List>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    fullWidth={false}
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => navigate(`/teams/${team.id}/edit`)}
                    disabled={team.league.teamsLocked}
                    sx={{ mr: 1 }}
                  >
                    Modifica
                  </Button>
                  
                  {isLocked ? (
                    <Box sx={{ flex: 1, p: 1, bgcolor: 'error.main', color: 'white', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Flag fontSize="small" />
                      <Typography variant="button" fontWeight="bold">Gara in Corso</Typography>
                    </Box>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<SportsMotorsports />}
                      onClick={() => navigate(`/teams/${team.id}/lineup/${nextRace.id}`)}
                      disabled={!nextRace}
                    >
                      {team.hasLineup ? 'Modifica Formazione' : 'Schiera Formazione'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
