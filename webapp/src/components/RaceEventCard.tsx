// webapp/src/components/RaceEventCard.tsx
import type { ReactNode } from 'react';
import { Card, CardContent, CardActions, Typography, Box, Button, Chip, LinearProgress, Tooltip } from '@mui/material';
import { Block, CalendarToday, EmojiEvents, LocationOn, Person, SportsScore, Speed } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, isBefore, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import type { MyRaceScore, Race } from '../types';
import { getGpDate, getSprintDate } from '../utils/raceDates';
import { getRaceCancellationNotice, isSessionCancelled } from '../utils/raceCancellation';

interface RaceEventCardProps {
  race: Race;
  myScores?: MyRaceScore[];
}

function SummaryLine({ icon, label, value, valueColor }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  valueColor?: string;
}) {
  return (
    <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
      {icon}
      <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={800} color={valueColor} noWrap sx={{ ml: 'auto', minWidth: 0 }}>
        {value}
      </Typography>
    </Box>
  );
}

// Riepilogo delle gare concluse: vincitore della gara MotoGP e i tuoi punti della giornata
function RaceSummary({ race, myScores = [] }: { race: Race; myScores?: MyRaceScore[] }) {
  const motogpCancelled = isSessionCancelled(race, 'MOTOGP', 'RACE');
  const winner = motogpCancelled
    ? 'gara annullata'
    : race.motogpWinner?.name ?? (race.hasResults ? '-' : 'risultati in arrivo');

  return (
    <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.055)', display: 'grid', gap: 0.5 }}>
      <SummaryLine
        icon={<EmojiEvents sx={{ fontSize: 16, color: '#FFB300', flexShrink: 0 }} />}
        label="Vincitore MotoGP"
        value={winner}
        valueColor={motogpCancelled ? 'warning.main' : undefined}
      />
      {myScores.length === 1 && (
        <SummaryLine
          icon={<Person sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />}
          label="I tuoi punti"
          value={`${myScores[0].points} pt`}
        />
      )}
      {myScores.length > 1 && myScores.map(score => (
        <SummaryLine
          key={score.leagueId}
          icon={<Person sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />}
          label={score.leagueName}
          value={`${score.points} pt`}
        />
      ))}
    </Box>
  );
}

export function RaceEventCard({ race, myScores }: RaceEventCardProps) {
  const navigate = useNavigate();
  const raceDate = getGpDate(race);
  const sprintDate = getSprintDate(race);
  const startDate = new Date(race.startDate);
  const endDate = new Date(race.endDate);
  const now = new Date();
  
  // Una gara è passata solo dopo la fine dell'intero weekend
  const isPast = isAfter(now, endDate);
  
  // Una gara è in corso dal momento dell'inizio ufficiale alla fine del weekend
  const isInProgress = isAfter(now, startDate) && isBefore(now, endDate);
  
  const isUpcoming = isBefore(now, startDate);
  
  // Il countdown si basa sull'inizio della gara vera e propria (gpDate)
  const daysUntil = differenceInDays(raceDate, now);
  const cancellationNotice = getRaceCancellationNotice(race);

  const getStatusLabel = () => {
    if (race.isCancelled) return 'Annullata';
    if (isPast) return 'Conclusa';
    if (isInProgress) return 'In Corso';
    if (daysUntil === 0) return 'Oggi';
    if (daysUntil === 1) return 'Domani';
    if (daysUntil <= 7) return `${daysUntil} giorni`;
    return format(raceDate, 'dd MMM', { locale: it });
  };

  const getStatusColor = () => {
    if (race.isCancelled) return 'error';
    if (isPast) return 'default';
    if (isInProgress) return 'error';
    if (daysUntil === 0) return 'warning';
    if (daysUntil <= 3) return 'warning';
    if (daysUntil <= 7) return 'info';
    return 'success';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      {race.trackLayoutUrl && (
          <Box
              sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  height: '80%',
                  backgroundImage: `url(${race.trackLayoutUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                  opacity: 0.1,
                  zIndex: 0,
              }}
          />
      )}
    
      {/* Header con Status Badge (Attivo durante tutto il weekend) */}
      {isInProgress && !race.isCancelled && (
        <Box sx={{
          bgcolor: 'error.main',
          color: 'white',
          py: 0.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}>
          <SportsScore fontSize="small" />
          <Typography variant="caption" fontWeight="bold">
            RACE WEEKEND IN CORSO
          </Typography>
          <SportsScore
            fontSize="small"
            sx={{
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }}
          />
        </Box>
      )}

      <CardContent sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        pb: 1,
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} sx={{ height: 24 }}>
          <Chip
            label={`Round ${race.round}`}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
          <Chip
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
        </Box>

        <Tooltip title={race.name}>
            <Typography
                variant="h6"
                sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    mb: 1.5,
                    minHeight: '2.6em',
                    lineHeight: '1.3em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    '-webkit-box-orient': 'vertical',
                    '-webkit-line-clamp': '2',
                }}
                >
                {race.name}
            </Typography>
        </Tooltip>

        {/* Informazioni */}
        <Box sx={{ mb: 1 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <CalendarToday fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {race.circuit}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LocationOn fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {race.country}
            </Typography>
          </Box>
          {sprintDate && (
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Speed fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Sprint: {format(sprintDate, 'dd/MM', { locale: it })}
              </Typography>
            </Box>
          )}
          <Box display="flex" alignItems="center" gap={1}>
            <SportsScore fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              Gara: {format(raceDate, 'dd/MM', { locale: it })}
            </Typography>
          </Box>
          {cancellationNotice && (
            <Tooltip title={cancellationNotice.description}>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Block fontSize="small" color={cancellationNotice.severity} sx={{ flexShrink: 0 }} />
                <Typography variant="body2" color={`${cancellationNotice.severity}.main`} fontWeight={700} noWrap>
                  {cancellationNotice.shortLabel}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Spacer che si espande */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Countdown, oppure riepilogo per le gare concluse */}
        {isPast ? (
          <RaceSummary race={race} myScores={myScores} />
        ) : (isUpcoming || isInProgress) && daysUntil > 0 ? (
          <Box sx={{ pt: 1 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="caption">Countdown</Typography>
              <Typography variant="caption" fontWeight="bold">
                {daysUntil} giorni
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, ((30 - daysUntil) / 30) * 100))}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        ) : (
          <Box sx={{ height: '40px' }} /> // Placeholder per mantenere l'altezza
        )}
      </CardContent>

      <CardActions sx={{
        p: 2,
        pt: 1,
        flexShrink: 0 // Impedisce a questa sezione di restringersi
      }}>
        <Button
          size="small"
          fullWidth
          onClick={() => navigate(`/races/${race.id}`)}
          variant="text"
          sx={{ height: 36 }}
        >
          Dettagli Gara
        </Button>
      </CardActions>
    </Card>
  );
}
