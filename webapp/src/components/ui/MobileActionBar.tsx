import type { ReactNode } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

interface MobileActionBarProps {
  label: string;
  value?: ReactNode;
  helper?: ReactNode;
  actionLabel: string;
  loadingLabel?: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function MobileActionBar({
  label,
  value,
  helper,
  actionLabel,
  loadingLabel = 'Operazione...',
  onAction,
  disabled,
  loading,
}: MobileActionBarProps) {
  return (
    <Paper
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 72,
        zIndex: 1099,
        px: 2,
        py: 1.5,
        borderTop: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 0,
      }}
      elevation={8}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
          {value && (
            <Typography variant="subtitle1" fontWeight={900} lineHeight={1.1}>
              {value}
            </Typography>
          )}
          {helper && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {helper}
            </Typography>
          )}
        </Box>
        <Button variant="contained" onClick={onAction} disabled={disabled || loading}>
          {loading ? loadingLabel : actionLabel}
        </Button>
      </Stack>
    </Paper>
  );
}
