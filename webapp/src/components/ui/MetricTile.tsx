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
      className="liquid-glass"
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        height: '100%',
        minHeight: { xs: 82, sm: 94 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: `${tone}.main`,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, width: '100%' }}>
        {icon && (
          <Box
            sx={{
              width: { xs: 34, sm: 38 },
              height: { xs: 34, sm: 38 },
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: `${tone}.main`,
              backgroundColor: (theme) => `${theme.palette[tone].main}24`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.08 }}>
            {value}
          </Typography>
          {helper && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {helper}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
