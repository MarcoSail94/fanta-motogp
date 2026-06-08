// webapp/src/pages/ProfilePage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Switch,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Email,
  Lock,
  Edit,
  Save,
  Cancel,
  Notifications,
  DarkMode,
  LightMode,
  EmojiEvents,
  Groups,
  SportsMotorsports,
  TrendingUp,
  Timeline,
  AttachMoney,
  CalendarToday,
  CheckCircle,
  Visibility,
  VisibilityOff,
  Delete,
  Logout,
  Security,
  WorkspacePremium,
  Star
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfile, getMyStats } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import api from '../services/api';

interface UserStats {
  totalTeams: number;
  totalLeagues: number;
  totalPoints: number;
  bestPosition: number;
  gamesPlayed: number;
  winRate: number;
  averagePointsPerRace: number;
  favoriteCategory: string;
  totalWins: number;
  totalPodiums: number;
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  
  const [editMode, setEditMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emailNotifications: false,
    raceReminders: true,
    resultNotifications: true,
    leagueUpdates: true,
    darkMode: false
  });

  // Query profilo completo
  const { data: profileData, isLoading: loadingProfile, isError: profileError } = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: async () => {
      const response = await getProfile();
      return response.data || response;
    }
  });

  // Query statistiche
  const { data: statsData, isLoading: loadingStats, isError: statsError } = useQuery({
    queryKey: queryKeys.auth.stats,
    queryFn: getMyStats
  });

  // Mutation aggiornamento profilo
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/profile', data),
    onSuccess: (response) => {
      notify('Profilo aggiornato con successo', 'success');
      updateUser(response.data.user);
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore aggiornamento profilo', 'error');
    }
  });

  // Mutation cambio password
  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/change-password', data),
    onSuccess: () => {
      notify('Password aggiornata con successo', 'success');
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore cambio password', 'error');
    }
  });

  // Mutation eliminazione account
  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete('/auth/account'),
    onSuccess: () => {
      notify('Account eliminato con successo', 'success');
      logout();
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore eliminazione account', 'error');
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('Le password non coincidono', 'error');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      notify('La password deve essere almeno 6 caratteri', 'error');
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const handleSettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
    
    // Salva impostazioni (potresti voler fare una chiamata API qui)
    notify('Impostazioni aggiornate', 'success');
  };

  if (loadingProfile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (profileError && !user) {
    return <Alert severity="error">Errore nel caricamento del profilo.</Alert>;
  }

  const stats: UserStats = statsData?.stats || {
    totalTeams: 0,
    totalLeagues: 0,
    totalPoints: 0,
    bestPosition: 0,
    gamesPlayed: 0,
    winRate: 0,
    averagePointsPerRace: 0,
    favoriteCategory: 'MOTOGP',
    totalWins: 0,
    totalPodiums: 0
  };

  const profileUser = profileData?.user || user;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profilo Utente
      </Typography>

      <Grid container spacing={3}>
        {/* Colonna Sinistra - Info Profilo */}
        <Grid size={{ xs: 12, md: 4}}>
          {/* Card Profilo */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mb: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '3rem'
                  }}
                >
                  {profileUser?.username?.charAt(0).toUpperCase()}
                </Avatar>
                
                {!editMode ? (
                  <>
                    <Typography variant="h5" gutterBottom>
                      {profileUser?.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {profileUser?.email}
                    </Typography>

                    <Box width="100%" mt={3}>
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <AttachMoney />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Crediti Disponibili"
                            secondary={`${profileUser?.credits || 0}€`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CalendarToday />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Membro dal"
                            secondary={profileUser?.createdAt ? 
                              format(new Date(profileUser.createdAt), 'MMMM yyyy', { locale: it }) 
                              : 'N/D'
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Stato Account"
                            secondary={
                              <Chip 
                                label="Attivo" 
                                size="small" 
                                color="success"
                              />
                            }
                          />
                        </ListItem>
                      </List>
                    </Box>

                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setEditMode(true)}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Modifica Profilo
                    </Button>
                  </>
                ) : (
                  <Box width="100%" mt={2}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      margin="normal"
                      inputProps={{ maxLength: 20 }}
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      margin="normal"
                    />

                    <Stack direction="row" spacing={2} mt={3}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        fullWidth
                      >
                        Salva
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={() => {
                          setEditMode(false);
                          setProfileForm({
                            username: profileUser?.username || '',
                            email: profileUser?.email || ''
                          });
                        }}
                        fullWidth
                      >
                        Annulla
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Card Badge e Achievements */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Badge e Riconoscimenti
              </Typography>
              <Grid container spacing={2}>
                {stats.totalWins > 0 && (
                  <Grid size={{ xs: 4}}>
                    <Box textAlign="center">
                      <WorkspacePremium sx={{ color: '#FFD700', fontSize: 40 }} />
                      <Typography variant="caption" display="block">
                        Vincitore
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        x{stats.totalWins}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {stats.totalPodiums > 0 && (
                  <Grid size={{ xs: 4}}>
                    <Box textAlign="center">
                      <EmojiEvents sx={{ color: '#C0C0C0', fontSize: 40 }} />
                      <Typography variant="caption" display="block">
                        Podio
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        x{stats.totalPodiums}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {stats.gamesPlayed >= 10 && (
                  <Grid size={{ xs: 4}}>
                    <Box textAlign="center">
                      <Star sx={{ color: '#CD7F32', fontSize: 40 }} />
                      <Typography variant="caption" display="block">
                        Veterano
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        10+ GP
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Colonna Destra - Statistiche e Impostazioni */}
        <Grid size={{ xs: 12, md: 8}}>
          {/* Card Statistiche */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Le Tue Statistiche
              </Typography>

              {loadingStats ? (
                <Box display="flex" justifyContent="center" py={5}>
                  <CircularProgress size={28} />
                </Box>
              ) : statsError ? (
                <Alert severity="warning">
                  Statistiche temporaneamente non disponibili.
                </Alert>
              ) : (
                <>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 6, sm: 4}}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
                        <EmojiEvents sx={{ fontSize: 30, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                          {stats.totalPoints}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Punti Totali
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4}}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
                        <EmojiEvents sx={{ fontSize: 30, color: 'success.main', mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                          #{stats.bestPosition || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Miglior Posizione
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4}}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
                        <Groups sx={{ fontSize: 30, color: 'warning.main', mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                          {stats.totalTeams}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Team Attivi
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4}}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.lighter' }}>
                        <SportsMotorsports sx={{ fontSize: 30, color: 'info.main', mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                          {stats.totalLeagues}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Leghe Attive
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4}}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter' }}>
                        <Timeline sx={{ fontSize: 30, color: 'error.main', mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                          {stats.gamesPlayed}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Gare Giocate
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4}}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.lighter' }}>
                        <TrendingUp sx={{ fontSize: 30, color: 'secondary.main', mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                          {stats.winRate}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Win Rate
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box mt={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Media Punti per Gara
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (stats.averagePointsPerRace / 100) * 100)}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {stats.averagePointsPerRace.toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Categoria Preferita
                    </Typography>
                    <Chip
                      label={stats.favoriteCategory}
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card Impostazioni */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Impostazioni
              </Typography>
              
              <List>
                {/* Notifiche */}
                <ListItem>
                  <ListItemIcon>
                    <Notifications />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Notifiche Push"
                    secondary="Ricevi notifiche per gare e risultati"
                  />
                  <Switch
                    checked={settings.notificationsEnabled}
                    onChange={handleSettingChange('notificationsEnabled')}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Notifiche Email"
                    secondary="Ricevi aggiornamenti via email"
                  />
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={handleSettingChange('emailNotifications')}
                  />
                </ListItem>

                <Divider />

                {/* Preferenze Notifiche */}
                <ListItem>
                  <ListItemText 
                    primary="Promemoria Gare"
                    secondary="Notifica prima dell'inizio delle gare"
                    inset
                  />
                  <Switch
                    checked={settings.raceReminders}
                    onChange={handleSettingChange('raceReminders')}
                    disabled={!settings.notificationsEnabled}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Risultati Gare"
                    secondary="Notifica quando sono disponibili i risultati"
                    inset
                  />
                  <Switch
                    checked={settings.resultNotifications}
                    onChange={handleSettingChange('resultNotifications')}
                    disabled={!settings.notificationsEnabled}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Aggiornamenti Lega"
                    secondary="Notifica per cambiamenti nelle tue leghe"
                    inset
                  />
                  <Switch
                    checked={settings.leagueUpdates}
                    onChange={handleSettingChange('leagueUpdates')}
                    disabled={!settings.notificationsEnabled}
                  />
                </ListItem>

                <Divider />

                {/* Tema */}
                <ListItem>
                  <ListItemIcon>
                    {settings.darkMode ? <DarkMode /> : <LightMode />}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tema Scuro"
                    secondary="Attiva il tema scuro dell'applicazione"
                  />
                  <Switch
                    checked={settings.darkMode}
                    onChange={handleSettingChange('darkMode')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Card Sicurezza */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sicurezza e Privacy
              </Typography>
              
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Lock />}
                  onClick={() => setShowPasswordDialog(true)}
                  fullWidth
                >
                  Cambia Password
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Security />}
                  onClick={() => notify('Funzione in sviluppo', 'info')}
                  fullWidth
                >
                  Verifica in Due Passaggi
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Logout />}
                  onClick={logout}
                  fullWidth
                >
                  Disconnetti
                </Button>
                
                <Divider />
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setShowDeleteDialog(true)}
                  fullWidth
                >
                  Elimina Account
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Cambio Password */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambia Password</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              type={showCurrentPassword ? 'text' : 'password'}
              label="Password Attuale"
              fullWidth
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              type={showNewPassword ? 'text' : 'password'}
              label="Nuova Password"
              fullWidth
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              helperText="Minimo 6 caratteri"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              type={showConfirmPassword ? 'text' : 'password'}
              label="Conferma Nuova Password"
              fullWidth
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              error={passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword}
              helperText={
                passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword
                  ? "Le password non coincidono"
                  : ""
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowPasswordDialog(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          }}>
            Annulla
          </Button>
          <Button 
            variant="contained"
            onClick={handleChangePassword}
            disabled={
              !passwordForm.currentPassword || 
              !passwordForm.newPassword || 
              passwordForm.newPassword !== passwordForm.confirmPassword ||
              passwordForm.newPassword.length < 6 ||
              changePasswordMutation.isPending
            }
          >
            {changePasswordMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Elimina Account */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1} color="error.main">
            <Delete />
            Elimina Account
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Attenzione! Questa azione è irreversibile.
          </Alert>
          <Typography variant="body2">
            Eliminando il tuo account:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Perderai tutti i tuoi team e le statistiche" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Sarai rimosso da tutte le leghe" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Non potrai recuperare i tuoi dati" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Sei sicuro di voler procedere?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Annulla
          </Button>
          <Button 
            variant="contained"
            color="error"
            onClick={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? 'Eliminazione...' : 'Elimina Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
