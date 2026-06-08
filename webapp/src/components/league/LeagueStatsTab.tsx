import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type CategoryName = 'MOTOGP' | 'MOTO2' | 'MOTO3';

interface RaceStat {
  raceId: string;
  raceName: string;
  raceDate: string;
  topTeam: string;
  topPoints: number;
}

interface PopularRider {
  riderId: string;
  riderName: string;
  teamCount: number;
}

interface CategoryStats {
  avg: number;
  min: number;
  max: number;
}

interface LeagueStatsData {
  raceStats?: RaceStat[];
  popularRiders?: PopularRider[];
  categoryStats?: Partial<Record<CategoryName, CategoryStats>>;
}

interface LeagueStatsTabProps {
  leagueData?: LeagueStatsData;
  league: {
    currentTeams?: number;
    teams?: unknown[];
  };
  isMobile: boolean;
}

const CATEGORIES: CategoryName[] = ['MOTOGP', 'MOTO2', 'MOTO3'];
const EMPTY_CATEGORY_STATS: CategoryStats = { avg: 0, max: 0, min: 0 };

export function LeagueStatsTab({ leagueData, league, isMobile }: LeagueStatsTabProps) {
  const raceStats = leagueData?.raceStats ?? [];
  const popularRiders = leagueData?.popularRiders ?? [];
  const currentTeams = league.currentTeams ?? league.teams?.length ?? 0;

  return (
    <Grid container spacing={isMobile ? 2 : 3}>
      <Grid size={{ xs: 12, md: 6}}>
        <Card>
          <CardContent>
            <Typography
              variant={isMobile ? 'subtitle1' : 'h6'}
              gutterBottom
              fontWeight="bold"
            >
              Top Scorer per Gara
            </Typography>
            {raceStats.length > 0 ? (
              <List dense={isMobile}>
                {raceStats.map((stat) => (
                  <ListItem key={stat.raceId}>
                    <ListItemText
                      primary={stat.raceName}
                      secondary={`Winner: ${stat.topTeam} - ${stat.topPoints} pt`}
                      primaryTypographyProps={{
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    />
                    <Chip
                      label={format(new Date(stat.raceDate), 'dd/MM', { locale: it })}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nessuna statistica disponibile
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6}}>
        <Card>
          <CardContent>
            <Typography
              variant={isMobile ? 'subtitle1' : 'h6'}
              gutterBottom
              fontWeight="bold"
            >
              Piloti più Scelti
            </Typography>
            {popularRiders.length > 0 && currentTeams > 0 ? (
              <List dense={isMobile}>
                {popularRiders.slice(0, 5).map((rider, idx) => {
                  const percentage = Math.round((rider.teamCount / currentTeams) * 100);

                  return (
                    <ListItem key={rider.riderId}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {idx + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={rider.riderName}
                        secondary={
                          <Box>
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{ mt: 1, height: 6 }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                            >
                              {rider.teamCount}/{currentTeams} team ({percentage}%)
                            </Typography>
                          </Box>
                        }
                        primaryTypographyProps={{
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nessun dato sui piloti più scelti.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardContent>
            <Typography
              variant={isMobile ? 'subtitle1' : 'h6'}
              gutterBottom
              fontWeight="bold"
            >
              Performance Media per Categoria
            </Typography>
            <Grid container spacing={2}>
              {CATEGORIES.map(category => {
                const stats = leagueData?.categoryStats?.[category] ?? EMPTY_CATEGORY_STATS;

                return (
                  <Grid key={category} size={{ xs: 12, sm: 4}}>
                    <Paper sx={{ p: isMobile ? 1.5 : 2, textAlign: 'center' }}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                      >
                        {category}
                      </Typography>
                      <Typography
                        variant={isMobile ? 'h5' : 'h4'}
                        color="primary"
                      >
                        {stats.avg.toFixed(1)}
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                      >
                        Media punti
                      </Typography>
                      <Box display="flex" justifyContent="space-around" mt={1}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Min</Typography>
                          <Typography variant="body2">{stats.min}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Max</Typography>
                          <Typography variant="body2">{stats.max}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
