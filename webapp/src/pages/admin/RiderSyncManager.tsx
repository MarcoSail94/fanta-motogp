import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncRiders, syncCalendar } from '../../services/api';
import { queryKeys } from '../../services/queryKeys';
import { useNotification } from '../../contexts/NotificationContext';
import { Card, CardContent, Typography, Button, Stack, CircularProgress, Box } from '@mui/material';
import { Sync, People, CalendarMonth } from '@mui/icons-material';

export default function RiderSyncManager() {
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const syncRidersMutation = useMutation({
    mutationFn: syncRiders,
    onSuccess: () => {
      notify('Sincronizzazione piloti avviata in background.', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.riders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.riders.list });
    },
    onError: () => notify('Errore durante la sincronizzazione dei piloti.', 'error'),
  });

  const syncCalendarMutation = useMutation({
    mutationFn: (year: number) => syncCalendar(year),
    onSuccess: () => {
      notify('Sincronizzazione calendario avviata in background.', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.races.allRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.races.upcoming });
    },
    onError: () => notify('Errore durante la sincronizzazione del calendario.', 'error'),
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Sincronizzazione Dati Principali
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body1">
              Aggiorna la lista di tutti i piloti ufficiali, i loro team e le categorie per la stagione corrente.
            </Typography>
            <Button
              variant="contained"
              startIcon={<People />}
              onClick={() => syncRidersMutation.mutate()}
              disabled={syncRidersMutation.isPending}
              sx={{ mt: 1 }}
            >
              {syncRidersMutation.isPending ? <CircularProgress size={24} /> : 'Sincronizza Piloti'}
            </Button>
          </Box>
          <Box>
            <Typography variant="body1">
              Aggiorna il calendario completo delle gare per la stagione corrente.
            </Typography>
            <Button
              variant="contained"
              startIcon={<CalendarMonth />}
              onClick={() => syncCalendarMutation.mutate(new Date().getFullYear())}
              disabled={syncCalendarMutation.isPending}
              sx={{ mt: 1 }}
            >
              {syncCalendarMutation.isPending ? <CircularProgress size={24} /> : 'Sincronizza Calendario'}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
