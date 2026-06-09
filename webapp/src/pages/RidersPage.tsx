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
  Chip,
  Stack,
} from '@mui/material';
import { Search, SportsMotorsports } from '@mui/icons-material';
import { RiderCard } from '../components/RiderCard';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

export default function RidersPage() {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MOTOGP' | 'MOTO2' | 'MOTO3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const categoryOptions = [
    { value: 'ALL', label: 'Tutti', color: '#E60023' },
    { value: 'MOTOGP', label: 'MotoGP', color: '#E60023' },
    { value: 'MOTO2', label: 'Moto2', color: '#FF6B00' },
    { value: 'MOTO3', label: 'Moto3', color: '#2979FF' },
  ] as const;

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
      <Paper className="liquid-glass-nav" sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={900}>
              Scouting piloti
            </Typography>
            <Chip size="small" label={`${filteredRiders.length} risultati`} color="primary" variant="outlined" />
          </Stack>
          <Grid container spacing={1.5} alignItems="center">
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
                sx={{
                  gap: 0.75,
                  '& .MuiToggleButtonGroup-grouped': {
                    border: '1px solid rgba(255,255,255,0.12) !important',
                    borderRadius: '12px !important',
                    color: 'text.secondary',
                    py: 1,
                    minWidth: 0,
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    bgcolor: 'rgba(255,255,255,0.035)',
                  },
                }}
              >
                {categoryOptions.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    sx={{
                      '&.Mui-selected': {
                        color: 'white',
                        borderColor: `${option.color} !important`,
                        bgcolor: `${option.color}26`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 18px ${option.color}22`,
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: `${option.color}33`,
                      },
                    }}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Stack>
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
