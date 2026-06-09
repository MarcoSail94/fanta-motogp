import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRiderById } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Avatar,
  Chip,
  Stack,
} from '@mui/material';
import { AccountBalanceWallet, EmojiEvents, Flag, SportsMotorsports, Timeline } from '@mui/icons-material';
import { MetricTile } from '../components/ui/MetricTile';

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

  const currentStats = rider.statistics?.[0] || {};
  const categoryColors: Record<string, string> = {
    MOTOGP: '#E60023',
    MOTO2: '#FF6B00',
    MOTO3: '#2979FF',
  };
  const accent = categoryColors[rider.category] || '#E60023';
  const riderInitials = rider.name
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const totalPoints = currentStats.points ?? rider.totalPoints ?? 0;
  const averagePoints = Number(currentStats.averagePoints ?? rider.averagePoints ?? 0);

  return (
    <Box>
      <Paper
        className="liquid-glass-strong"
        sx={{
          p: { xs: 2, md: 3 },
          mb: 2.5,
          overflow: 'hidden',
          position: 'relative',
          border: `1px solid ${accent}66`,
          backgroundImage: `
            linear-gradient(135deg, ${accent}33, rgba(18,18,25,0.88) 50%, rgba(255,255,255,0.04)),
            radial-gradient(circle at 92% 0%, ${accent}30, transparent 30%)
          `,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Avatar
            src={rider.photoUrl || undefined}
            sx={{
              width: { xs: 88, sm: 118 },
              height: { xs: 88, sm: 118 },
              bgcolor: accent,
              fontSize: { xs: 28, sm: 36 },
              fontWeight: 900,
              border: '1px solid rgba(255,255,255,0.24)',
              boxShadow: `0 18px 44px ${accent}33`,
            }}
          >
            {riderInitials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Chip label={rider.category} size="small" sx={{ bgcolor: `${accent}33`, color: 'white' }} />
              <Chip label={rider.riderType} size="small" variant="outlined" />
            </Stack>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 1.8 }}>
              Scheda pilota
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                lineHeight: 1.02,
                fontSize: { xs: '2rem', sm: '3rem' },
              }}
            >
              #{rider.number} {rider.name}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 0.75 }}>
              {rider.team}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Valore" value={rider.value} helper="crediti" icon={<AccountBalanceWallet />} tone="secondary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Punti" value={totalPoints} helper="stagione" icon={<EmojiEvents />} tone="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Media" value={averagePoints.toFixed(1)} helper="punti gara" icon={<Timeline />} tone="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile label="Vittorie" value={currentStats.wins || 0} helper={`${currentStats.podiums || 0} podi`} icon={<Flag />} tone="primary" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="liquid-glass" sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Scheda pilota
            </Typography>
            <Stack spacing={1.5}>
              {[
                ['Categoria', rider.category],
                ['Team', rider.team],
                ['Nazionalita', rider.nationality || '-'],
                ['Tipo', rider.riderType],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.10)',
                    bgcolor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    {label}
                  </Typography>
                  <Typography fontWeight={900}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="liquid-glass" sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ minHeight: 240, textAlign: 'center' }}>
              <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>
                <SportsMotorsports sx={{ fontSize: 52 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={900}>
                  Nessun risultato recente
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 520 }}>
                  I risultati del pilota compariranno qui quando saranno disponibili.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
