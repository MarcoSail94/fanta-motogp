// webapp/src/pages/RaceDetailPage.tsx
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRaceById, getRaceResults, getQualifyingResults } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import {
  Box, Typography, CircularProgress, Alert, Card, useMediaQuery,
  Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, Stack, ToggleButtonGroup, useTheme,
  ToggleButton, Grid, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import { EmojiEvents, Timer, Speed, SportsScore } from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RaceResult {
  rider: {
    id: string;
    name: string;
    number: number;
    team: string;
    category: string;
  };
  position: number;
  status: string;
  points?: number;
  time?: string;
  gap?: string;
  totalLaps?: number;
  bestLap?: {
    time: string;
    number?: number;
  };
}

const categoryColors = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00',
  MOTO3: '#1976D2',
};

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

// Componente Mobile per visualizzare un risultato
function MobileResultCard({ result, index, selectedSession }: {
  result: RaceResult;
  index: number;
  selectedSession: string;
}) {
  const isPodium = result.position <= 3;
  const isDNF = result.status !== 'FINISHED';
  const isRaceOrSprint = selectedSession === 'race' || selectedSession === 'sprint';

  return (
    <Card
      sx={{
        mb: 1,
        borderLeft: isPodium ? 4 : 0,
        borderColor: isPodium ?
          (result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : '#CD7F32')
          : 'transparent',
        backgroundColor: isDNF ? 'rgba(255, 0, 0, 0.05)' : 'inherit'
      }}
    >
      <Box sx={{ p: 1.5 }}>
        {/* Prima riga: Posizione, Numero, Nome */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1
          }}
        >
          {/* Posizione */}
          <Box
            sx={{
              minWidth: 35,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPodium && (
              <EmojiEvents
                sx={{
                  fontSize: 18,
                  color: result.position === 1 ? '#FFD700' :
                         result.position === 2 ? '#C0C0C0' : '#CD7F32',
                  mr: 0.5
                }}
              />
            )}
            <Typography
              variant={isPodium ? "subtitle1" : "body2"}
              fontWeight={isPodium ? "bold" : "medium"}
              color={isDNF ? "error" : "text.primary"}
            >
              {isDNF ? 'DNF' : result.position}
            </Typography>
          </Box>

          {/* Numero */}
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.75rem',
              bgcolor: 'primary.main'
            }}
          >
            {result.rider.number}
          </Avatar>

          {/* Nome Pilota */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" fontWeight="medium" noWrap>
              {result.rider.name}
            </Typography>
          </Box>

          {/* Punti (solo per gara/sprint) */}
          {isRaceOrSprint && (
            <Typography variant="subtitle1" fontWeight="bold" color="primary">
              {result.points || 0} pt
            </Typography>
          )}
        </Box>

        {/* Seconda riga: Team */}
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {result.rider.team}
          </Typography>
        </Box>

        {/* Terza riga: Dati specifici per tipo di sessione */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          {isRaceOrSprint ? (
            <>
              {/* Time */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time: {result.time || result.gap || '-'}
                </Typography>
              </Box>

              {/* Laps */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Giri: {result.totalLaps || '-'}
                </Typography>
              </Box>

              {/* Status se non è FINISHED */}
              {isDNF && (
                <Chip
                  label={result.status}
                  size="small"
                  color="error"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </>
          ) : (
            /* FP1, FP2, PR, Qualifiche - Solo Giro Veloce */
            <Box>
              <Typography variant="caption" color="text.secondary">
                Giro veloce: {result.bestLap?.time || '-'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
}

export default function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'MOTOGP' | 'MOTO2' | 'MOTO3'>('MOTOGP');
  const [selectedSession, setSelectedSession] = useState<'race' | 'sprint' | 'qualifying' | 'fp1' | 'fp2' | 'pr'>('race');

  const { data: raceData, isLoading: loadingRace } = useQuery({
    queryKey: queryKeys.races.detail(raceId),
    queryFn: () => getRaceById(raceId!),
    enabled: !!raceId,
  });

  // Query per risultati gara e sprint
  const { data: raceResultsData, isLoading: loadingRaceResults } = useQuery({
    queryKey: queryKeys.races.results(raceId),
    queryFn: () => getRaceResults(raceId!),
    enabled: !!raceId && !!raceData,
  });

  // Query per risultati qualifiche
  const { data: qualifyingData, isLoading: loadingQualifying } = useQuery({
    queryKey: queryKeys.races.qualifying(raceId),
    queryFn: () => getQualifyingResults(raceId!),
    enabled: !!raceId && !!raceData && selectedSession === 'qualifying',
  });

  // Query per risultati prove libere
  const { data: practiceData, isLoading: loadingPractice } = useQuery({
    queryKey: queryKeys.races.practice(raceId, selectedSession),
    queryFn: () => getRaceResults(raceId!, selectedSession as 'fp1' | 'fp2' | 'pr'),
    enabled: !!raceId && !!raceData && (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr'),
  });

  // Calcola i risultati da mostrare basandosi sulla sessione e categoria selezionate
  const categoryResults = useMemo(() => {
    if (selectedSession === 'qualifying') {
      return qualifyingData?.results?.[selectedCategory] || [];
    }

    if (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr') {
      const sessionKey = selectedSession.toUpperCase() as 'FP1' | 'FP2' | 'PR';
      return practiceData?.results?.[sessionKey]?.[selectedCategory] || [];
    }

    const sessionKey = selectedSession.toUpperCase() as 'RACE' | 'SPRINT';
    const sessionResults = raceResultsData?.results?.[sessionKey];
    return sessionResults?.[selectedCategory] || [];
  }, [selectedSession, selectedCategory, raceResultsData, qualifyingData, practiceData]);

  const loadingResults = selectedSession === 'qualifying' ? loadingQualifying :
                         (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr') ? loadingPractice :
                         loadingRaceResults;

  if (loadingRace) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!raceData) {
    return <Alert severity="error">Gara non trovata</Alert>;
  }

  const race = raceData.race;
  const hasResults = raceResultsData?.results && Object.keys(raceResultsData.results).length > 0;
  const hasSprint = !!race.sprintDate;

  return (
    <Box className="fade-in" sx={{ pb: 2 }}>
      {/* Header - Responsive */}
      <Paper
        sx={{
          p: isMobile ? 2 : 4,
          mb: isMobile ? 2 : 4,
          background: `linear-gradient(135deg, rgba(230,0,35,0.8), rgba(20,20,20,0.9))`,
          color: 'white',
        }}
      >
        <Stack
          direction={isMobile ? "column" : "row"}
          justifyContent="space-between"
          alignItems={isMobile ? "flex-start" : "flex-start"}
          spacing={2}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                opacity: 0.8,
                fontSize: isMobile ? '0.7rem' : '0.75rem'
              }}
            >
              Round {race.round} - {race.season}
            </Typography>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              gutterBottom
              sx={{ fontSize: isMobile ? '1.75rem' : '3rem' }}
            >
              {race.name}
            </Typography>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{
                opacity: 0.9,
                fontSize: isMobile ? '1rem' : '1.5rem'
              }}
            >
              {race.circuit}
            </Typography>
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Chip
                label={format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })}
                size={isMobile ? "small" : "medium"}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  width: isMobile ? 'fit-content' : 'auto'
                }}
              />
              {race.status === 'FINISHED' && (
                <Chip
                  label="Completata"
                  color="success"
                  size={isMobile ? "small" : "medium"}
                />
              )}
            </Stack>
          </Box>
          {!isMobile && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h1" sx={{ fontSize: 120, opacity: 0.2 }}>
                {race.round}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          scrollButtons={isMobile ? false : "auto"}
        >
          <Tab label="Risultati" />
          <Tab label="Info Gara" />
          <Tab label="Statistiche" />
        </Tabs>

        {/* Tab Risultati - Responsive */}
        <TabPanel value={tabValue} index={0}>
          {hasResults ? (
            <>
              {/* Selettore Sessione - Responsive */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 'medium',
                    color: 'text.primary',
                    mb: 1.5
                  }}
                >
                  Seleziona Sessione
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'center' : 'flex-start'
                  }}
                >
                  <ToggleButtonGroup
                    value={selectedSession}
                    exclusive
                    onChange={(_, value) => value && setSelectedSession(value)}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      '& .MuiToggleButton-root': {
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          }
                        },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }
                    }}
                  >
                    <ToggleButton value="race">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SportsScore sx={{ fontSize: isMobile ? 16 : 18 }} />
                        <Typography variant={isMobile ? "caption" : "body2"}>
                          Gara
                        </Typography>
                      </Box>
                    </ToggleButton>
                    {hasSprint && (
                      <ToggleButton value="sprint">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Speed sx={{ fontSize: isMobile ? 16 : 18 }} />
                          <Typography variant={isMobile ? "caption" : "body2"}>
                            Sprint
                          </Typography>
                        </Box>
                      </ToggleButton>
                    )}
                    <ToggleButton value="qualifying">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Timer sx={{ fontSize: isMobile ? 16 : 18 }} />
                        <Typography variant={isMobile ? "caption" : "body2"}>
                          Qualifiche
                        </Typography>
                      </Box>
                    </ToggleButton>
                    <ToggleButton value="fp2">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        FP2
                      </Typography>
                    </ToggleButton>
                     <ToggleButton value="pr">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        PR
                      </Typography>
                    </ToggleButton>
                    <ToggleButton value="fp1">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        FP1
                      </Typography>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {/* Selettore Categoria - Responsive */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 'medium',
                    color: 'text.primary',
                    mb: 1.5
                  }}
                >
                  Categoria
                </Typography>
                <ToggleButtonGroup
                  value={selectedCategory}
                  exclusive
                  onChange={(_, value) => value && setSelectedCategory(value)}
                  fullWidth={isMobile}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    '& .MuiToggleButton-root': {
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                        borderColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }
                    }
                  }}
                >
                  {['MOTOGP', 'MOTO2', 'MOTO3'].map(cat => (
                    <ToggleButton
                      key={cat}
                      value={cat}
                      sx={{
                        '&.Mui-selected .MuiChip-root': {
                          transform: 'scale(1.1)',
                          boxShadow: 2
                        }
                      }}
                    >
                      <Chip
                        label={cat}
                        size="small"
                        sx={{
                          backgroundColor: categoryColors[cat as keyof typeof categoryColors],
                          color: 'white',
                          fontSize: isMobile ? '0.7rem' : '0.75rem',
                          fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* Risultati - Layout Responsive */}
              {loadingResults ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : categoryResults.length > 0 ? (
                isMobile ? (
                  // Layout Mobile - Cards
                  <Box>
                    {categoryResults.map((result: RaceResult, index: number) => (
                      <MobileResultCard
                        key={`${result.rider.id}-${index}`}
                        result={result}
                        index={index}
                        selectedSession={selectedSession}
                      />
                    ))}
                  </Box>
                ) : (
                  // Layout Desktop - Tabella
                  <TableContainer component={Paper} elevation={0}>
                    <Table size={isTablet ? "small" : "medium"}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Pos</TableCell>
                          <TableCell>Pilota</TableCell>
                          <TableCell>Team</TableCell>
                          {(selectedSession === 'race' || selectedSession === 'sprint') ? (
                            <>
                              <TableCell align="right">Time</TableCell>
                              <TableCell align="right">Laps</TableCell>
                              <TableCell align="right">Punti</TableCell>
                            </>
                          ) : (
                            <TableCell align="right">Giro Veloce</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryResults.map((result: RaceResult, index: number) => {
                          const isPodium = result.position <= 3;
                          const isDNF = result.status !== 'FINISHED';
                          const isRaceOrSprint = selectedSession === 'race' || selectedSession === 'sprint';

                          return (
                            <TableRow
                              key={`${result.rider.id}-${index}`}
                              sx={{
                                backgroundColor: isPodium ?
                                  `${result.position === 1 ? '#FFD700' :
                                     result.position === 2 ? '#C0C0C0' : '#CD7F32'}22`
                                  : 'inherit',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                            >
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {isPodium && (
                                    <EmojiEvents sx={{
                                      fontSize: 20,
                                      color: result.position === 1 ? '#FFD700' :
                                             result.position === 2 ? '#C0C0C0' : '#CD7F32'
                                    }}/>
                                  )}
                                  <Typography
                                    fontWeight={isPodium ? 'bold' : 'normal'}
                                    color={isDNF ? 'error' : 'inherit'}
                                  >
                                    {isDNF ? result.status : result.position}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Avatar
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      fontSize: '0.875rem',
                                      bgcolor: 'primary.main'
                                    }}
                                  >
                                    {result.rider.number}
                                  </Avatar>
                                  <Typography fontWeight="medium">
                                    {result.rider.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {result.rider.team}
                                </Typography>
                              </TableCell>
                              {isRaceOrSprint ? (
                                <>
                                  <TableCell align="right">
                                    {result.time || result.gap || '-'}
                                  </TableCell>
                                  <TableCell align="right">
                                    {result.totalLaps || '-'}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography fontWeight="bold" color="primary">
                                      {result.points || 0}
                                    </Typography>
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {result.bestLap?.time || '-'}
                                  </Typography>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              ) : (
                <Alert severity="info">
                  Nessun risultato disponibile per {
                    selectedSession === 'qualifying' ? 'Qualifiche' :
                    selectedSession === 'sprint' ? 'Sprint' :
                    selectedSession === 'fp1' ? 'Prove Libere 1' :
                    selectedSession === 'fp2' ? 'Prove Libere 2' :
                    selectedSession === 'pr' ? 'Prequalifiche' : 'Gara'
                  }
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info">
              I risultati di questa gara non sono ancora disponibili
            </Alert>
          )}
        </TabPanel>

        {/* Tab Info Gara - Responsive */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid size={{ xs: 12, md: 6}}>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                gutterBottom
              >
                Dettagli Circuito
              </Typography>
              <List dense={isMobile}>
                <ListItem>
                  <ListItemText
                    primary="Circuito"
                    secondary={race.circuit}
                    primaryTypographyProps={{
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Paese"
                    secondary={race.country}
                    primaryTypographyProps={{
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Data GP"
                    secondary={format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })}
                    primaryTypographyProps={{
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  />
                </ListItem>
                {race.sprintDate && (
                  <ListItem>
                    <ListItemText
                      primary="Data Sprint"
                      secondary={format(new Date(race.sprintDate), 'dd MMMM yyyy', { locale: it })}
                      primaryTypographyProps={{
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 6}}>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                gutterBottom
              >
                Programma Weekend
              </Typography>
              <List dense={isMobile}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? '0.75rem' : '1rem'
                      }}
                    >
                      FP1
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Prove Libere 1"
                    secondary="Venerdì mattina"
                    primaryTypographyProps={{
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? '0.75rem' : '1rem'
                      }}
                    >
                      FP2
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Prove Libere 2"
                    secondary="Venerdì pomeriggio"
                    primaryTypographyProps={{
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: 'secondary.main',
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? '0.75rem' : '1rem'
                      }}
                    >
                      Q
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Qualifiche"
                    secondary="Sabato pomeriggio"
                    primaryTypographyProps={{
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab Statistiche */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1" color="text.secondary">
            Statistiche della gara in arrivo...
          </Typography>
        </TabPanel>
      </Card>
    </Box>
  );
}
