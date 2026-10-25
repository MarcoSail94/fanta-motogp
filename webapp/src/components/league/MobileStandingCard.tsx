import {
  Box,
  Card,
  Chip,
  Typography,
} from '@mui/material';
import { WorkspacePremium } from '@mui/icons-material';
import { PositionChange } from './PositionChange';

export interface LeagueStanding {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints?: number | null;
  trend?: 'up' | 'down' | 'same' | null;
  positionChange?: number | null;
}

interface MobileStandingCardProps {
  standing: LeagueStanding;
  position: number;
  isUserTeam: boolean;
  gapFromLeader: number | null;
}

const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function MobileStandingCard({ standing, position, isUserTeam, gapFromLeader }: MobileStandingCardProps) {
  const podiumColor = position <= 3 ? podiumColors[position - 1] : undefined;
  const hasLastRace = standing.lastRacePoints !== null && standing.lastRacePoints !== undefined;
  const hasMoved = Boolean(standing.positionChange);

  return (
    <Card
      sx={{
        mb: 1,
        borderLeft: podiumColor ? 4 : 0,
        borderColor: podiumColor || 'transparent',
        backgroundColor: isUserTeam ? 'action.selected' : 'inherit'
      }}
    >
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ minWidth: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {podiumColor && <WorkspacePremium sx={{ fontSize: 18, color: podiumColor }} />}
          <Typography variant="h6" fontWeight={900} lineHeight={1}>
            {position}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {standing.teamName}
            {isUserTeam && (
              <Chip label="Tu" size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {standing.userName}
            </Typography>
            {hasLastRace && (
              <Chip
                label={`ultima giornata ${standing.lastRacePoints} pt`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem', color: 'text.secondary' }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={900} lineHeight={1.1}>
            {standing.totalPoints || 0}
          </Typography>
          {hasMoved ? (
            <PositionChange value={standing.positionChange} />
          ) : gapFromLeader ? (
            <Typography variant="caption" color="text.secondary">
              +{gapFromLeader} dal 1°
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Card>
  );
}
