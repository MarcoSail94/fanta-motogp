import { useState } from 'react';
import {
  Box,
  Card,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  WorkspacePremium,
} from '@mui/icons-material';

export interface LeagueStanding {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints?: number | null;
  trend?: 'up' | 'down' | 'same' | null;
}

interface MobileStandingCardProps {
  standing: LeagueStanding;
  position: number;
  isUserTeam: boolean;
  gapPrev: number | null;
  gapNext: number | null;
}

export function MobileStandingCard({ standing, position, isUserTeam, gapPrev, gapNext }: MobileStandingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPodium = position <= 3;

  return (
    <Card
      sx={{
        mb: 1,
        borderLeft: isPodium ? 4 : 0,
        borderColor: isPodium ?
          (position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32')
          : 'transparent',
        backgroundColor: isUserTeam ? 'action.selected' : 'inherit'
      }}
    >
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box
          sx={{
            minWidth: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {isPodium && (
            <WorkspacePremium
              sx={{
                fontSize: 20,
                color: position === 1 ? '#FFD700' :
                       position === 2 ? '#C0C0C0' : '#CD7F32'
              }}
            />
          )}
          <Typography
            variant={isPodium ? 'h6' : 'body1'}
            fontWeight={isPodium ? 'bold' : 'medium'}
          >
            {position}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {standing.teamName}
            {isUserTeam && (
              <Chip
                label="Tu"
                size="small"
                color="primary"
                sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {standing.userName}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right', mr: 1 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            {standing.totalPoints || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            punti
          </Typography>
        </Box>

        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 4}}>
              <Typography variant="caption" color="text.secondary">
                Ultima Gara
              </Typography>
              <Typography variant="body2">
                {standing.lastRacePoints ? `+${standing.lastRacePoints} pt` : '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4}}>
              <Typography variant="caption" color="text.secondary">
                Gap Prec.
              </Typography>
              <Typography variant="body2" color={gapPrev !== null ? 'error.main' : 'text.secondary'}>
                {gapPrev !== null ? `+${gapPrev}` : '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4}}>
              <Typography variant="caption" color="text.secondary">
                Gap Succ.
              </Typography>
              <Typography variant="body2" color={gapNext !== null ? 'success.main' : 'text.secondary'}>
                {gapNext !== null ? `-${gapNext}` : '-'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Card>
  );
}
