import { Box, Typography } from '@mui/material';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';

// Posizioni guadagnate (positivo) o perse (negativo) con l'ultima giornata
export function PositionChange({ value }: { value?: number | null }) {
  if (value === null || value === undefined) {
    return <Typography variant="caption" color="text.secondary">-</Typography>;
  }

  if (value === 0) {
    return <Typography variant="caption" color="text.secondary">=</Typography>;
  }

  const gained = value > 0;
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: gained ? 'success.main' : 'error.main' }}
      aria-label={gained ? `Guadagnate ${value} posizioni` : `Perse ${-value} posizioni`}
    >
      {gained ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
      <Typography variant="caption" fontWeight={800} color="inherit">
        {Math.abs(value)}
      </Typography>
    </Box>
  );
}
