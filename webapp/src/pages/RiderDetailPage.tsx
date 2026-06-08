// webapp/src/pages/RiderDetailPage.tsx

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRiderById } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';

export default function RiderDetailPage() {
  const { riderId } = useParams<{ riderId: string }>();

  const { data: riderData, isLoading, error } = useQuery({
    queryKey: queryKeys.riders.detail(riderId),
    queryFn: () => getRiderById(riderId!),
    enabled: !!riderId,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Errore nel caricamento del pilota.</Alert>;
  }

  const rider = riderData?.rider;

  if (!rider) {
    return <Alert severity="info">Pilota non trovato.</Alert>;
  }

  const currentStats = rider.statistics[0] || {};

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center' }}>
        <Box sx={{
          width: 120,
          height: 120,
          mr: 3,
          borderRadius: '50%',
          backgroundImage: `url(${rider.photoUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }} />
        <Box>
          <Typography variant="h3">#{rider.number} {rider.name}</Typography>
          <Typography variant="h5" color="text.secondary">{rider.team}</Typography>
          <Typography variant="body1">{rider.nationality}</Typography>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Info</Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Categoria" secondary={rider.category} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Valore" secondary={`${rider.value} crediti`} />
                </ListItem>
                 <Divider />
                <ListItem>
                  <ListItemText primary="Tipo" secondary={rider.riderType} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6}}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Statistiche Stagionali</Typography>
                <List>
                    <ListItem>
                        <ListItemText primary="Vittorie" secondary={currentStats.wins || 0} />
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemText primary="Podi" secondary={currentStats.podiums || 0} />
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemText primary="Punti" secondary={currentStats.points || 0} />
                    </ListItem>
                </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Risultati Recenti</Typography>
                    {/* Qui andrà un componente per visualizzare i risultati */}
                    <Typography>Componente risultati recenti da implementare.</Typography>
                </CardContent>
            </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
