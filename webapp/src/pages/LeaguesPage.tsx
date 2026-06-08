// src/pages/LeaguesPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyLeagues, getPublicLeagues, joinLeague } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { useNavigate } from 'react-router-dom';
import { 
   Box, Typography, CircularProgress, Card, CardContent, CardActions,
   Grid, Button, Chip, Stack, Dialog, DialogTitle, DialogContent,
   DialogActions, TextField, Tabs, Tab, IconButton, Paper, useTheme, 
   useMediaQuery, SpeedDial, SpeedDialAction, SpeedDialIcon
} from '@mui/material';
import { 
  EmojiEvents, Groups, Add, Lock, Public,
  ContentCopy, Login, Code, Check
} from '@mui/icons-material';

interface League {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  maxTeams: number;
  currentTeams: number;
  budget: number;
  userPosition?: number;
  userPoints?: number;
  hasTeam?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`league-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function LeagueCard({ league, onJoin, onView, isMyLeague }: {
  league: League;
  onJoin?: () => void;
  onView: () => void;
  isMyLeague?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [copied, setCopied] = useState(false);
  
  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(league.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      transition: 'box-shadow 0.3s',
      '&:hover': {
        boxShadow: 4
      }
    }}>
      <CardContent sx={{ 
        flexGrow: 1, 
        p: isMobile ? 1.5 : 2,
        pb: isMobile ? 1 : 1.5
      }}>
        {/* Header con nome e sport */}
        <Box mb={isMobile ? 1 : 1.5}>
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            sx={{ 
              fontWeight: 'bold',
              fontSize: isMobile ? '0.95rem' : '1.25rem',
              lineHeight: 1.2,
              mb: 0.5
            }}
            noWrap
          >
            {league.name}
          </Typography>
          
          {/* Chips per stato */}
          <Stack 
            direction="row" 
            spacing={0.5} 
            flexWrap="wrap" 
            useFlexGap
            sx={{ mt: 0.5 }}
          >
            <Chip
              icon={league.isPrivate ? <Lock /> : <Public />}
              label={league.isPrivate ? 'Privata' : 'Pubblica'}
              size="small"
              color={league.isPrivate ? 'default' : 'primary'}
              sx={{ 
                height: isMobile ? 20 : 24,
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                '& .MuiChip-icon': {
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }
              }}
            />
            {isMyLeague && league.userPosition && (
              <Chip
                icon={<EmojiEvents />}
                label={`${league.userPosition}° posto`}
                size="small"
                color="warning"
                sx={{ 
                  height: isMobile ? 20 : 24,
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  '& .MuiChip-icon': {
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }
                }}
              />
            )}
          </Stack>
        </Box>

        {/* Info compatte */}
        <Stack spacing={isMobile ? 0.5 : 1}>
          {/* Codice con icona copia inline */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            >
              Codice:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: 'primary.main',
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}
              >
                {league.code}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleCopyCode}
                sx={{ 
                  p: 0.25,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                {copied ? (
                  <Check sx={{ fontSize: isMobile ? 14 : 16, color: 'success.main' }} />
                ) : (
                  <ContentCopy sx={{ fontSize: isMobile ? 14 : 16, color: 'text.secondary' }} />
                )}
              </IconButton>
            </Box>
          </Box>

          {/* Partecipanti */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            >
              Partecipanti:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Groups sx={{ fontSize: isMobile ? 14 : 16, color: 'text.secondary' }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'medium',
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}
              >
                {league.currentTeams}/{league.maxTeams}
              </Typography>
            </Box>
          </Box>

          {/* Budget */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            >
              Budget:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'medium',
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            >
              {league.budget}€
            </Typography>
          </Box>

          {/* Punti (solo per le mie leghe) */}
          {isMyLeague && league.userPoints !== undefined && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
              >
                I tuoi punti:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold',
                  color: 'success.main',
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}
              >
                {league.userPoints} pts
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
      
      <CardActions sx={{ 
        p: isMobile ? 1.5 : 2, 
        pt: 0,
        gap: 1
      }}>
        {isMyLeague ? (
          <Button 
            fullWidth 
            variant="contained" 
            onClick={onView}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            Vai alla Lega
          </Button>
        ) : (
          <>
            <Button 
              variant="outlined" 
              onClick={onView}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                flex: 1,
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            >
              Dettagli
            </Button>
            {!league.hasTeam && (
              <Button
                variant="contained"
                color="primary"
                startIcon={!isMobile && <Login />}
                onClick={onJoin}
                disabled={league.currentTeams >= league.maxTeams}
                size={isMobile ? "small" : "medium"}
                sx={{ 
                  flex: 1,
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              >
                {league.currentTeams >= league.maxTeams ? 'Piena' : 'Unisciti'}
              </Button>
            )}
          </>
        )}
      </CardActions>
    </Card>
  );
}

export default function LeaguesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const { data: myLeaguesData, isLoading: loadingMyLeagues } = useQuery({
    queryKey: queryKeys.leagues.mine,
    queryFn: getMyLeagues,
  });

  const { data: publicLeaguesData, isLoading: loadingPublicLeagues } = useQuery({
    queryKey: queryKeys.leagues.public,
    queryFn: getPublicLeagues,
    enabled: tabValue === 1,
  });

  const joinLeagueMutation = useMutation({
    mutationFn: (code: string) => joinLeague(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.public });
      setJoinDialogOpen(false);
      setJoinCode('');
      setTabValue(0);
      alert('Ti sei unito alla lega con successo!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Errore durante l\'accesso alla lega');
    },
  });

  const handleJoinLeague = (codeOrId?: string) => {
    // Se viene passato un codice/ID direttamente (dalla lega pubblica)
    if (codeOrId) {
      joinLeagueMutation.mutate(codeOrId);
    } 
    // Altrimenti usa il codice dal dialog
    else if (joinCode) {
      joinLeagueMutation.mutate(joinCode);
    }
  };

  const handleViewLeague = (leagueId: string) => {
    navigate(`/leagues/${leagueId}`);
  };

  const handleCreateLeague = () => {
    navigate('/leagues/create');
  };

  const myLeagues: League[] = myLeaguesData?.leagues || [];
  const publicLeagues: League[] = publicLeaguesData?.leagues || [];

  const speedDialActions = [
    {
      icon: <Add />,
      name: 'Crea Lega',
      onClick: handleCreateLeague,
    },
    {
      icon: <Code />,
      name: 'Unisciti con Codice',
      onClick: () => setJoinDialogOpen(true),
    },
  ];

  const getGridColumns = () => {
    if (isMobile) return 12;
    if (isTablet) return 6;
    return 4;
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      pb: 10
    }}>
      <Box sx={{ 
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab 
            label="Le Mie Leghe" 
            icon={<EmojiEvents />} 
            iconPosition="start"
            sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}
          />
          <Tab 
            label="Leghe Pubbliche" 
            icon={<Public />} 
            iconPosition="start"
            sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}
          />
        </Tabs>
      </Box>

      <Box sx={{ p: isMobile ? 1.5 : 3 }}>
        {/* Le Mie Leghe */}
        <TabPanel value={tabValue} index={0}>
          {loadingMyLeagues ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : myLeagues.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Non sei ancora in nessuna lega
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Crea una nuova lega o unisciti a una esistente per iniziare a giocare!
              </Typography>
              <Stack direction={isMobile ? "column" : "row"} spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateLeague}
                  size={isMobile ? "small" : "medium"}
                >
                  Crea Lega
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Code />}
                  onClick={() => setJoinDialogOpen(true)}
                  size={isMobile ? "small" : "medium"}
                >
                  Unisciti con Codice
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Grid container spacing={isMobile ? 1.5 : 2}>
              {myLeagues.map((league: League) => (
                <Grid key={league.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <LeagueCard
                    league={league}
                    onView={() => handleViewLeague(league.id)}
                    isMyLeague
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Leghe Pubbliche */}
        <TabPanel value={tabValue} index={1}>
          {loadingPublicLeagues ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : publicLeagues.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Nessuna lega pubblica disponibile
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Al momento non ci sono leghe pubbliche aperte. Puoi creare la tua!
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateLeague}
                sx={{ mt: 2 }}
                size={isMobile ? "small" : "medium"}
              >
                Crea Lega
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={isMobile ? 1.5 : 2}>
              {publicLeagues.map((league: League) => (
                <Grid key={league.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <LeagueCard
                    league={league}
                    onJoin={() => handleJoinLeague(league.code)}
                    onView={() => handleViewLeague(league.id)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Box>

      {/* FAB con Speed Dial */}
      <SpeedDial
        ariaLabel="Azioni Lega"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              setSpeedDialOpen(false);
              action.onClick();
            }}
          />
        ))}
      </SpeedDial>

      {/* Dialog Unisciti con Codice */}
      <Dialog 
        open={joinDialogOpen} 
        onClose={() => setJoinDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { m: isMobile ? 2 : 3 }
        }}
      >
        <DialogTitle>Unisciti a una Lega</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Codice Lega"
            fullWidth
            variant="outlined"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Inserisci il codice"
            inputProps={{ 
              style: { 
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
                fontSize: isMobile ? '0.9rem' : '1rem'
              } 
            }}
            size={isMobile ? "small" : "medium"}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setJoinDialogOpen(false)}
            size={isMobile ? "small" : "medium"}
          >
            Annulla
          </Button>
          <Button
            onClick={() => handleJoinLeague()}
            variant="contained"
            disabled={!joinCode || joinLeagueMutation.isPending}
            size={isMobile ? "small" : "medium"}
          >
            {joinLeagueMutation.isPending ? 'Accesso...' : 'Unisciti'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
