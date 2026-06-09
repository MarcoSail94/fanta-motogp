// webapp/src/pages/LoginPage.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Alert, CircularProgress, Paper, Avatar, Stack } from '@mui/material';
import SportsMotorsportsIcon from '@mui/icons-material/SportsMotorsports';

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); 
  const from = location.state?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(emailOrUsername, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Paper
        elevation={6}
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
              Fanta MotoGP
            </Typography>
            <Typography color="text.secondary">
              Accedi al tuo garage e prepara il prossimo round.
            </Typography>
          </Box>
        </Stack>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          {error && <Alert severity="error" sx={{ my: 2, width: '100%' }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="emailOrUsername"
            label="Email o Username"
            name="emailOrUsername"
            autoComplete="email"
            autoFocus
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Accedi'}
          </Button>
          <Button fullWidth onClick={() => navigate('/register')}>
            Non hai un account? Registrati
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
