// src/pages/RegisterPage.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Alert, CircularProgress, Paper, Avatar, Stack } from '@mui/material';
import SportsMotorsportsIcon from '@mui/icons-material/SportsMotorsports';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(email, username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Paper
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: { xs: 3, sm: 4 },
          border: '1px solid rgba(230,0,35,0.22)',
          background: `
            linear-gradient(135deg, rgba(230,0,35,0.16), rgba(26,26,35,0.94) 58%),
            radial-gradient(circle at 88% 6%, rgba(255,107,0,0.18), transparent 30%)
          `,
        }}
      >
        <Stack spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <SportsMotorsportsIcon />
          </Avatar>
          <Box textAlign="center">
            <Typography component="h1" variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
              Crea account
            </Typography>
            <Typography color="text.secondary">
              Entra in griglia e costruisci il tuo primo team.
            </Typography>
          </Box>
        </Stack>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3, width: '100%' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField margin="normal" required fullWidth id="email" label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField margin="normal" required fullWidth id="username" label="Username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField margin="normal" required fullWidth name="confirmPassword" label="Conferma Password" type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Registrati'}
          </Button>
          <Button fullWidth onClick={() => navigate('/login')}>
            Hai già un account? Accedi
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
