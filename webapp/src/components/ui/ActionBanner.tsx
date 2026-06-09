import type { ReactNode } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

interface ActionBannerProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export function ActionBanner({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  tone = 'primary',
}: ActionBannerProps) {
  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: `${tone}.main`,
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette[tone].main}24 0%, rgba(26,26,35,0.92) 70%)`,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                color: `${tone}.main`,
                backgroundColor: (theme) => `${theme.palette[tone].main}1F`,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={900}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Stack>
        {actionLabel && onAction && (
          <Button
            variant="contained"
            color={tone}
            onClick={onAction}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
