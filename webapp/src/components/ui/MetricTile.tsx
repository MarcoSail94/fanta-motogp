import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

interface MetricTileProps {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export function MetricTile({ label, value, helper, icon, tone = 'primary' }: MetricTileProps) {
  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        border: '1px solid',
        borderColor: `${tone}.main`,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {icon && (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              color: `${tone}.main`,
              bgcolor: `${tone}.main`,
              backgroundColor: (theme) => `${theme.palette[tone].main}1F`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            {value}
          </Typography>
          {helper && (
            <Typography variant="caption" color="text.secondary">
              {helper}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
