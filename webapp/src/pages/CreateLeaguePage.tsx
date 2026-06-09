// webapp/src/pages/CreateLeaguePage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeague } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { Box, Typography, TextField, Button, Stack,
  FormControlLabel, Switch, Slider, Grid, Paper, CircularProgress
} from '@mui/material';
import { AccountBalanceWallet, Groups, Lock, Public } from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { MetricTile } from '../components/ui/MetricTile';
import { PageHeader } from '../components/ui/PageHeader';

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
    <Box maxWidth="lg" mx="auto">
      <PageHeader
        eyebrow="Nuova lega"
        title="Crea campionato"
        subtitle="Definisci accesso, posti disponibili e budget iniziale della competizione."
      />

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            component="form"
            className="liquid-glass-strong"
            onSubmit={handleSubmit}
            sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}
          >
            <Stack spacing={3}>
              <TextField
                fullWidth
                required
                label="Nome della Lega"
                value={name}
                onChange={(e) => setName(e.target.value)}
                variant="outlined"
                helperText="Scegli un nome che rappresenti la tua competizione."
              />

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.12)',
                  bgcolor: 'rgba(255,255,255,0.045)',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={900}>
                      Accesso lega
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isPrivate ? 'Ingresso tramite codice invito.' : 'Visibile nelle leghe pubbliche.'}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    sx={{ m: 0, flexShrink: 0 }}
                    control={
                      <Switch
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={isPrivate ? 'Privata' : 'Pubblica'}
                  />
                </Stack>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>Team massimi: {maxTeams}</Typography>
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
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800}>Budget iniziale: {budget} crediti</Typography>
                    <Slider
                      value={budget}
                      onChange={(_, newValue) => setBudget(newValue as number)}
                      aria-labelledby="budget-slider"
                      valueLabelDisplay="auto"
                      step={50}
                      min={500}
                      max={1000}
                    />
                  </Stack>
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={createLeagueMutation.isPending}
                >
                  {createLeagueMutation.isPending ? <CircularProgress size={24} /> : 'Crea lega'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/leagues')}
                >
                  Annulla
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <MetricTile
              label="Accesso"
              value={isPrivate ? 'Privata' : 'Pubblica'}
              helper={isPrivate ? 'con codice' : 'aperta'}
              icon={isPrivate ? <Lock /> : <Public />}
              tone={isPrivate ? 'primary' : 'success'}
            />
            <MetricTile
              label="Team"
              value={maxTeams}
              helper="posti disponibili"
              icon={<Groups />}
              tone="warning"
            />
            <MetricTile
              label="Budget"
              value={budget}
              helper="crediti iniziali"
              icon={<AccountBalanceWallet />}
              tone="secondary"
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
