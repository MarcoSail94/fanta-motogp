import { ReactNode } from 'react';
import { Box } from '@mui/material';

interface LeagueTabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

export function LeagueTabPanel({ children, value, index, ...other }: LeagueTabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}
