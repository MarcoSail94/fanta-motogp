// webapp/src/pages/HomePage.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getMyTeams, getUpcomingRaces, getLatestRaceScoresStatus } from '../services/api';
import {
  Box, Typography, Grid, Paper, Button, Stack, Chip, Skeleton, Avatar, useTheme
} from '@mui/material';
import {
  SportsScore, ArrowForward, EmojiEvents, AccessTime, Flag, Assessment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const { data: racesData, isLoading: loadingRaces } = useQuery({ queryKey: ['upcomingRaces'], queryFn: getUpcomingRaces });
  const { data: scoresStatus } = useQuery({ queryKey: ['latestScoresStatus'], queryFn: getLatestRaceScoresStatus });
  
  const { data: leaguesData, isLoading: loadingLeagues } = useQuery({ queryKey: ['myLeagues'], queryFn: getMyLeagues });
  const { data: teamsData, isLoading: loadingTeams } = useQuery({ queryKey: ['myTeams'], queryFn: getMyTeams });

  const nextRace = racesData?.races?.[0];
  const leagues = leaguesData?.leagues || [];
  const teams = teamsData?.teams || [];
  
  const isLoading = loadingRaces || loadingLeagues || loadingTeams;

  // Calcolo della scadenza e dello stato "In Corso"
  const targetDate = nextRace ? new Date(nextRace.sprintDate || nextRace.gpDate) : null;
  const isLocked = targetDate ? new Date() >= targetDate : false;

  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!targetDate || isLocked) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      // Ricalcola se è diventato bloccato in questo esatto momento
      if (now >= targetDate) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        clearInterval(timer);
        return;
      }
      
      const days = differenceInDays(targetDate, now);
      const hours = differenceInHours(targetDate, now) % 24;
      const minutes = differenceInMinutes(targetDate, now) % 60;
      setTimeLeft({ days, hours, minutes });
    }, 60000); // Update ogni minuto
    
    // Init immediato
    const now = new Date();
    if (now < targetDate) {
      setTimeLeft({
        days: differenceInDays(targetDate, now),
        hours: differenceInHours(targetDate, now) % 24,
        minutes: differenceInMinutes(targetDate, now) % 60
      });
    }

    return () => clearInterval(timer);
  }, [targetDate, isLocked]);

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4 }} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4 }} /></Grid>
      </Grid>
    );
  }

  return (
    <Box className="fade-in">

      {/* Banner Punteggi Calcolati Disponibili */}
      {scoresStatus?.hasNewScores && (
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, #1A2E1A 100%)`,
            border: `1px solid ${theme.palette.success.main}55`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            boxShadow: `0 8px 32px ${theme.palette.success.main}22`,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
              <Assessment fontSize="medium" sx={{ color: 'white' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" color="white" lineHeight={1.2}>
                Fanta Punteggi Aggiornati!
              </Typography>
              <Typography variant="body2" color="success.light" sx={{ mt: 0.5 }}>
                I punteggi del <strong>{scoresStatus.lastRaceName}</strong> sono stati appena calcolati per i tuoi team.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            color="success"
            endIcon={<ArrowForward />}
            onClick={() => navigate(`/teams`)} 
            sx={{ fontWeight: 'bold', width: { xs: '100%', sm: 'auto' } }}
          >
            Vedi Punteggi Team
          </Button>
        </Paper>
      )}

      {/* Hero Section con Animazione e Texture */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: `
            linear-gradient(135deg, ${theme.palette.primary.dark}cc 0%, #000000cc 100%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          animation: 'pulse 3s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 40px rgba(230, 0, 35, 0.2)' },
            '50%': { boxShadow: '0 0 70px rgba(230, 0, 35, 0.5)' },
            '100%': { boxShadow: '0 0 40px rgba(230, 0, 35, 0.2)' },
          }
        }}
      >
        <Box sx={{
          position: 'absolute', right: -50, top: -50, opacity: 0.1,
          transform: 'rotate(15deg)'
        }}>
          <SportsScore sx={{ fontSize: 400 }} />
        </Box>

        <Grid container alignItems="center" spacing={4}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Chip 
              label={nextRace ? `ROUND ${nextRace.round}` : "STAGIONE 2024"} 
              color="secondary" 
              size="small" 
              sx={{ mb: 2, fontWeight: 'bold' }} 
            />
            <Typography variant="h2" sx={{ 
              fontWeight: 900, 
              textTransform: 'uppercase', 
              mb: 1, 
              fontSize: { xs: '2rem', md: '3.5rem' },
              lineHeight: 1,
              fontStyle: 'italic',
              background: 'linear-gradient(45deg, #FFFFFF 30%, #E60023 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 10px rgba(230,0,35,0.3))'
            }}>
              {nextRace ? nextRace.name : "Prossimamente"}
            </Typography>
            <Typography variant="h5" sx={{ opacity: 0.8, mb: 4, fontWeight: 300 }}>
              {nextRace ? `${nextRace.circuit}, ${nextRace.country}` : "Resta sintonizzato per la prossima stagione"}
            </Typography>
            
            {nextRace && (
              <Button 
                variant="contained" 
                size="large" 
                endIcon={<ArrowForward />}
                onClick={() => navigate(`/races/${nextRace.id}`)}
                sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
              >
                Vai alla Gara
              </Button>
            )}
          </Grid>
          
          <Grid size={{ xs: 12, md: 5 }}>
            {nextRace && (
              <Box sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)', 
                backdropFilter: 'blur(10px)', 
                p: 3, 
                borderRadius: 3,
                border: isLocked ? '1px solid rgba(230,0,35,0.5)' : '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center'
              }}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={2}>
                   <AccessTime fontSize="small" color={isLocked ? "error" : "primary"} />
                   <Typography variant="overline" color={isLocked ? "error.main" : "text.secondary"} fontWeight="bold">
                     {isLocked ? "SCADENZA TERMINATA" : "SCADENZA FORMAZIONE"}
                   </Typography>
                </Stack>
                
                {isLocked ? (
                  <Box py={2}>
                    <Typography variant="h5" fontWeight="900" color="error.main" sx={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Flag /> GARA IN CORSO
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Formazioni bloccate</Typography>
                  </Box>
                ) : (
                  <Stack direction="row" justifyContent="center" spacing={2} divider={<Typography variant="h4" sx={{opacity: 0.3}}>:</Typography>}>
                    <Box>
                      <Typography variant="h3" fontWeight="bold" color="white">{Math.max(0, timeLeft.days)}</Typography>
                      <Typography variant="caption" color="text.secondary">GIORNI</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h3" fontWeight="bold" color="white">{Math.max(0, timeLeft.hours)}</Typography>
                      <Typography variant="caption" color="text.secondary">ORE</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h3" fontWeight="bold" color="primary.main">{Math.max(0, timeLeft.minutes)}</Typography>
                      <Typography variant="caption" color="text.secondary">MIN</Typography>
                    </Box>
                  </Stack>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Widget 1: Classifica Rapida */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
               <Typography variant="h6" fontWeight="bold">Le Mie Leghe</Typography>
               <Button size="small" onClick={() => navigate('/leagues')}>Vedi Tutte</Button>
            </Box>
            
            <Stack spacing={2}>
              {leagues.length > 0 ? leagues.slice(0, 3).map((league: any) => (
                <Box 
                  key={league.id} 
                  onClick={() => navigate(`/leagues/${league.id}`)}
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: 'background.default', 
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateX(5px)' }
                  }}
                >
                  <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', mr: 2, fontWeight: 'bold' }}>
                    {league.name.charAt(0)}
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography fontWeight="bold">{league.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {league.currentTeams}/{league.maxTeams} Partecipanti
                    </Typography>
                  </Box>
                  {league.userPosition && (
                    <Chip 
                      icon={<EmojiEvents sx={{ fontSize: 16 }} />} 
                      label={`${league.userPosition}°`} 
                      color={league.userPosition <= 3 ? "warning" : "default"} 
                      size="small" 
                    />
                  )}
                </Box>
              )) : (
                <Typography color="text.secondary" align="center">Non sei in nessuna lega.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Widget 2: Stato Team */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
               <Typography variant="h6" fontWeight="bold">I Miei Team</Typography>
               <Button size="small" onClick={() => navigate('/teams')}>Gestisci</Button>
            </Box>

            <Grid container spacing={2}>
              {teams.slice(0, 2).map((team: any) => (
                <Grid size={{ xs: 12 }} key={team.id}>
                  <Box sx={{ 
                      p: 2, 
                      border: '1px solid',
                      borderColor: (!team.hasLineup && nextRace && !isLocked) ? 'warning.main' : 'rgba(255,255,255,0.1)',
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      bgcolor: 'background.default'
                    }}
                  >
                     {!team.hasLineup && nextRace && !isLocked && (
                       <Box sx={{ 
                         position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: 'warning.main' 
                       }} />
                     )}
                     
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                           <Typography fontWeight="bold">{team.name}</Typography>
                           <Typography variant="caption" color="text.secondary">{team.league.name}</Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="h5" color="primary.main" fontWeight="bold">
                            {team.totalPoints || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Punti Totali</Typography>
                        </Box>
                     </Stack>
                     
                     <Box mt={2} display="flex" justifyContent="flex-end">
                        {nextRace && (
                          isLocked ? (
                            <Chip 
                              icon={<Flag />} 
                              label="In Corso" 
                              color="error" 
                              variant="outlined" 
                              size="small" 
                              sx={{ fontWeight: 'bold' }}
                            />
                          ) : (
                            <Button 
                              size="small" 
                              variant={!team.hasLineup ? "contained" : "outlined"}
                              color={!team.hasLineup ? "warning" : "primary"}
                              onClick={() => navigate(`/teams/${team.id}/lineup/${nextRace.id}`)}
                            >
                              {!team.hasLineup ? "Schiera Formazione" : "Modifica"}
                            </Button>
                          )
                        )}
                     </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}