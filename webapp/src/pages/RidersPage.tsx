// webapp/src/pages/RidersPage.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRiders } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import type { Rider } from '../types';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Alert,
} from '@mui/material';
import { Search, SportsMotorsports } from '@mui/icons-material';
import { RiderCard } from '../components/RiderCard';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

export default function RidersPage() {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MOTOGP' | 'MOTO2' | 'MOTO3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: ridersData, isLoading, error } = useQuery<{ riders: Rider[] }>({
    queryKey: queryKeys.riders.all,
    queryFn: () => getRiders({ limit: 200 }),
  });

  const filteredRiders = useMemo(() => {
    if (!ridersData) return [];
    return ridersData.riders.filter(rider => {
      const isOfficial = rider.riderType === 'OFFICIAL';
      const matchesCategory = selectedCategory === 'ALL' || rider.category === selectedCategory;
      const matchesSearch =
        rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rider.team.toLowerCase().includes(searchQuery.toLowerCase());
      return isOfficial && matchesCategory && matchesSearch;
    });
  }, [ridersData, selectedCategory, searchQuery]);

  if (isLoading) {
    return <CircularProgress />;
  }
  if (error) {
    return <Alert severity="error">Errore nel caricamento dei piloti.</Alert>;
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Scouting"
        title="Piloti ufficiali"
        subtitle="Filtra per categoria, valuta costo e rendimento, poi entra nel dettaglio pilota."
      />
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Cerca per nome o team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ToggleButtonGroup
              value={selectedCategory}
              exclusive
              onChange={(_, newValue) => newValue && setSelectedCategory(newValue)}
              fullWidth
            >
              <ToggleButton value="ALL">Tutti</ToggleButton>
              <ToggleButton value="MOTOGP">MotoGP</ToggleButton>
              <ToggleButton value="MOTO2">Moto2</ToggleButton>
              <ToggleButton value="MOTO3">Moto3</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {filteredRiders.length > 0 ? (
          filteredRiders.map(rider => (
            <Grid key={rider.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <RiderCard rider={rider} />
            </Grid>
          ))
        ) : (
          <Grid size={{ xs:12 }}>
            <EmptyState
              icon={<SportsMotorsports sx={{ fontSize: 56 }} />}
              title="Nessun pilota trovato"
              description="Prova a cambiare categoria o termine di ricerca."
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
