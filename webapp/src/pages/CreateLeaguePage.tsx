// webapp/src/pages/CreateLeaguePage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeague } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { Box, Typography, Card, CardContent, TextField, Button, Stack,
  FormControlLabel, Switch, Slider, Grid, Paper, CircularProgress
} from '@mui/material';
import { useNotification } from '../contexts/NotificationContext';

export default function CreateLeaguePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxTeams, setMaxTeams] = useState<number>(7);
  const [budget, setBudget] = useState<number>(1000);

  const createLeagueMutation = useMutation({
    mutationFn: createLeague,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.mine });
      notify('Lega creata con successo!', 'success');
      navigate(`/leagues/${data.league.id}`);
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Impossibile creare la lega', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      notify('Il nome della lega deve contenere almeno 3 caratteri', 'warning');
      return;
    }
    createLeagueMutation.mutate({
      name,
      isPrivate,
      maxTeams,
      budget,
    });
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" gutterBottom>
        Crea una Nuova Lega
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Imposta le regole e invita i tuoi amici a sfidarsi.
      </Typography>

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12}}>
            <TextField
              fullWidth
              required
              label="Nome della Lega"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
              helperText="Scegli un nome che rappresenti la tua competizione."
            />
          </Grid>
          <Grid size={{ xs: 12}}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  color="primary"
                />
              }
              label="Lega Privata"
            />
            <Typography variant="caption" display="block" color="text.secondary">
              Se privata, la lega sarà accessibile solo tramite codice d'invito.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6}}>
            <Typography gutterBottom>Numero Massimo di Team ({maxTeams})</Typography>
            <Slider
              value={maxTeams}
              onChange={(_, newValue) => setMaxTeams(newValue as number)}
              aria-labelledby="max-teams-slider"
              valueLabelDisplay="auto"
              step={1}
              marks
              min={2}
              max={7}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6}}>
            <Typography gutterBottom>Budget Iniziale ({budget} crediti)</Typography>
            <Slider
              value={budget}
              onChange={(_, newValue) => setBudget(newValue as number)}
              aria-labelledby="budget-slider"
              valueLabelDisplay="auto"
              step={50}
              min={500}
              max={1000}
            />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={createLeagueMutation.isPending}
          >
            {createLeagueMutation.isPending ? <CircularProgress size={24} /> : 'Crea Lega'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/leagues')}
          >
            Annulla
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
