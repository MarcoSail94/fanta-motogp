// webapp/src/components/RoundRecapCard.tsx
import type { ReactNode } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { ThumbDownAltOutlined, ThumbUpAltOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { RiderPick, RoundSummary } from '../types';
import { categoryLabel } from '../utils/categories';
import { PositionChange } from './league/PositionChange';

function formatPosition(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return typeof value === 'number' ? `${value}°` : String(value);
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.055)', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>{children}</Box>
    </Box>
  );
}

function PickRow({ label, pick, tone, icon }: {
  label: string;
  pick: RiderPick;
  tone: 'success.main' | 'error.main';
  icon: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <Box sx={{ color: tone, display: 'flex' }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
        <Typography variant="body2" fontWeight={800} noWrap>
          {pick.rider}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" noWrap>
          {categoryLabel(pick.riderCategory)} · previsto {formatPosition(pick.predicted)} · arrivato {formatPosition(pick.actual)}
        </Typography>
      </Box>
      <Typography variant="subtitle2" fontWeight={900} color={tone} sx={{ flexShrink: 0 }}>
        {pick.points} pt
      </Typography>
    </Stack>
  );
}

// Riepilogo della giornata per una squadra: punti, classifica, scelta migliore e peggiore
export function RoundRecapCard({ summary, raceId, raceName }: {
  summary: RoundSummary;
  raceId: string;
  raceName: string;
}) {
  const navigate = useNavigate();

  return (
    <Paper className="liquid-glass" sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            La tua giornata · {summary.leagueName}
          </Typography>
          <Typography variant="subtitle1" fontWeight={900} noWrap>
            {raceName}
          </Typography>
        </Box>
        <Chip label={summary.teamName} size="small" color="success" variant="outlined" sx={{ flexShrink: 0, maxWidth: '45%' }} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 1 }}>
        <Metric label="Punti">
          <Typography variant="h6" fontWeight={900}>{summary.points}</Typography>
        </Metric>
        <Metric label="Posizione">
          <Typography variant="h6" fontWeight={900}>
            {summary.position ? `${summary.position}°` : '-'}
          </Typography>
          {summary.positionChange ? <PositionChange value={summary.positionChange} /> : null}
        </Metric>
        <Metric label="Squadre">
          <Typography variant="h6" fontWeight={900}>{summary.teamsCount}</Typography>
        </Metric>
      </Box>

      {summary.bestPick && (
        <PickRow label="Scelta migliore" pick={summary.bestPick} tone="success.main" icon={<ThumbUpAltOutlined fontSize="small" />} />
      )}
      {summary.worstPick && (
        <PickRow label="Scelta peggiore" pick={summary.worstPick} tone="error.main" icon={<ThumbDownAltOutlined fontSize="small" />} />
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1, '& .MuiButton-root': { whiteSpace: 'nowrap', letterSpacing: 0.5 } }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          onClick={() => navigate(`/leagues/${summary.leagueId}?tab=lineup&race=${raceId}`)}
        >
          Analisi punti
        </Button>
        <Button fullWidth size="small" variant="outlined" onClick={() => navigate(`/leagues/${summary.leagueId}`)}>
          Classifica
        </Button>
      </Stack>
    </Paper>
  );
}
