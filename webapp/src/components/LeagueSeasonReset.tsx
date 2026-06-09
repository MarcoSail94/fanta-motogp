// webapp/src/components/LeagueSeasonReset.tsx
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  TextField,
  Alert,
  Paper
} from '@mui/material';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface LeagueSeasonResetProps {
  leagueId: string;
  onResetComplete: () => void;
}

export const LeagueSeasonReset: React.FC<LeagueSeasonResetProps> = ({ leagueId, onResetComplete }) => {
  const { notify } = useNotification();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stati per le nuove date
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleReset = async () => {
    if (confirmText !== 'NUOVA STAGIONE') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/leagues/${leagueId}/reset-season`, {
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      
      setOpen(false);
      notify('Stagione resettata con successo. Team e crediti sono stati ripristinati.', 'success');
      onResetComplete(); // Ricarica i dati della pagina padre
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Errore durante il reset della stagione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ mt: 4, p: 3, border: '1px solid #ff4444', bgcolor: 'rgba(255, 68, 68, 0.04)' }}>
      <Typography variant="h6" color="error" gutterBottom>
        Zona Pericolosa: Nuova Stagione
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 2 }}>
        Attenzione: Questa è un'operazione distruttiva pensata per l'inizio di un nuovo campionato.
      </Alert>

      <Typography variant="body2" paragraph>
        Premendo il pulsante qui sotto:
      </Typography>
      <ul>
        <li><Typography variant="body2">Tutti i piloti verranno rimossi dai team (rose vuote).</Typography></li>
        <li><Typography variant="body2">I crediti torneranno al budget iniziale.</Typography></li>
        <li><Typography variant="body2">Tutti i punti e le classifiche verranno azzerati.</Typography></li>
        <li><Typography variant="body2">Utenti e Team rimarranno iscritti alla lega.</Typography></li>
      </ul>
      
      <Button 
        variant="contained" 
        color="error" 
        onClick={() => setOpen(true)}
        sx={{ mt: 1 }}
      >
        Inizializza Nuova Stagione
      </Button>

      {/* Finestra di conferma */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>Sei assolutamente sicuro?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Stai per cancellare tutta la storia di questa stagione per prepararti alla prossima. 
            Questa azione <strong>non può essere annullata</strong>.
          </DialogContentText>
          
          <Typography variant="subtitle2" gutterBottom>Imposta nuove date (Opzionale):</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              label="Inizio Stagione"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
            />
             <TextField
              label="Fine Stagione"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
            />
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            Per confermare, digita <strong>NUOVA STAGIONE</strong> nel campo sottostante.
          </Alert>
          
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="NUOVA STAGIONE"
            error={confirmText.length > 0 && confirmText !== 'NUOVA STAGIONE'}
            autoFocus
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>Annulla</Button>
          <Button 
            onClick={handleReset} 
            color="error" 
            variant="contained"
            disabled={confirmText !== 'NUOVA STAGIONE' || loading}
          >
            {loading ? 'Elaborazione...' : 'Conferma Reset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
