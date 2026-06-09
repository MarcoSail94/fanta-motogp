import type { ReactNode } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Paper
      sx={{
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
        border: '1px dashed rgba(255,255,255,0.16)',
      }}
    >
      <Stack spacing={2} alignItems="center">
        {icon && (
          <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 520 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actionLabel && onAction && (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
