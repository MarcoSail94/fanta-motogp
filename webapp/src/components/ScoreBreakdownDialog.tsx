// webapp/src/components/ScoreBreakdownDialog.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Typography, Chip, Paper, Collapse, Stack, Avatar,
  useMediaQuery, useTheme
} from '@mui/material';
import { EmojiEvents, ExpandMore, ExpandLess, Info } from '@mui/icons-material';

interface ScoreBreakdownProps {
  open: boolean;
  onClose: () => void;
  lineupData: any;
}

function formatPosition(value: unknown) {
  if (value === null || value === undefined || value === '' || value === 'N/A' || value === '-') return '-';
  return typeof value === 'number' ? `${value}°` : String(value).endsWith('°') ? String(value) : `${value}°`;
}

export function ScoreBreakdownDialog({ open, onClose, lineupData }: ScoreBreakdownProps) {
  const [showHelp, setShowHelp] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (!lineupData) return null;

  const { teamName, totalPoints, riderScores = [], lineup = [] } = lineupData;
  const hasScores = riderScores && riderScores.length > 0;

  const displayData = hasScores ? riderScores : lineup.map((l: any) => ({
    rider: l.rider.name,
    number: l.rider.number,
    riderCategory: l.rider.category,
    predicted: l.predictedPosition,
    actual: 'N/A',
    sprintPosition: 'N/A',
    base: '-',
    predictionMalus: '-',
    qualifyingBonus: '-',
    sprintBonus: '-',
    points: '-',
  }));

  const showSprintColumn = displayData.some((score: any) => score.riderCategory === 'MOTOGP');
  const categoryColors: Record<string, string> = {
    MOTOGP: '#E60023',
    MOTO2: '#FF6B00',
    MOTO3: '#2979FF',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: { xs: '100dvh', sm: 'calc(100% - 64px)' },
          height: { xs: '100dvh', sm: 'auto' },
          m: { xs: 0, sm: 4 },
          display: 'flex',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, flexShrink: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 1.6 }}>
              Analisi punti
            </Typography>
            <Typography variant="h6" fontWeight={900} noWrap>
              {teamName}
            </Typography>
          </Box>
          <Box
            sx={{
              minWidth: 86,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              textAlign: 'center',
              border: '1px solid rgba(230,0,35,0.35)',
              bgcolor: 'rgba(230,0,35,0.14)',
            }}
          >
            <EmojiEvents color={totalPoints ? "primary" : "disabled"} fontSize="small" />
            <Typography variant="h6" color={totalPoints ? "primary.main" : "text.secondary"} sx={{ fontWeight: 900, lineHeight: 1 }}>
              {totalPoints || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              punti
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      
      <DialogContent
        dividers
        sx={{
          px: { xs: 1, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <TableContainer
          component={Paper}
          className="liquid-glass"
          sx={{
            border: '1px solid rgba(255,255,255,0.12)',
            overflowX: 'auto',
            overflowY: 'hidden',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Table size="small" sx={{ minWidth: showSprintColumn ? 780 : 680 }}>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.055)' }}>
              <TableRow>
                <TableCell sx={{ px: 1 }}>Pilota</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Prev</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Gara</TableCell>
                {showSprintColumn && <TableCell align="center" sx={{ px: 0.5 }}>Sprint</TableCell>}
                <TableCell align="center" sx={{ px: 0.5 }}>Base</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Malus</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Qual B.</TableCell>
                {showSprintColumn && <TableCell align="center" sx={{ px: 0.5 }}>Sprint B.</TableCell>}
                <TableCell align="right" sx={{ px: 1 }}><strong>Tot</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((score: any, index: number) => {
                const accent = categoryColors[score.riderCategory] || '#E60023';
                return (
                  <TableRow
                    key={index}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.055)' },
                      '& td': { borderColor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    <TableCell sx={{ px: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: `${accent}2B`,
                            color: accent,
                            border: `1px solid ${accent}66`,
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          {score.number || '-'}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {score.rider.split(' ').pop()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {score.riderCategory || '-'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <Chip size="small" variant="outlined" label={formatPosition(score.predicted)} />
                    </TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <Typography variant="body2">
                        {formatPosition(score.actual)}
                      </Typography>
                    </TableCell>
                    {showSprintColumn && (
                      <TableCell align="center" sx={{ px: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {score.riderCategory === 'MOTOGP'
                            ? formatPosition(score.sprintPosition)
                            : '-'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <Typography variant="body2">{score.base}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      {hasScores && score.predictionMalus !== '-' ? (
                        <Typography variant="body2" color="error">
                          +{score.predictionMalus}
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      {score.qualifyingBonus && score.qualifyingBonus < 0 ? (
                        <Typography variant="body2" color="success.main">
                          {score.qualifyingBonus}
                        </Typography>
                      ) : '0'}
                    </TableCell>
                    {showSprintColumn && (
                      <TableCell align="center" sx={{ px: 0.5 }}>
                        {score.riderCategory === 'MOTOGP' && score.sprintBonus && score.sprintBonus < 0 ? (
                          <Typography variant="body2" color="info.main">
                            {score.sprintBonus}
                          </Typography>
                        ) : '0'}
                      </TableCell>
                    )}
                    <TableCell align="right" sx={{ px: 1 }}>
                      <Chip
                        label={score.points}
                        size="small"
                        color={score.points !== '-' ? "primary" : "default"}
                        variant={score.points !== '-' ? "filled" : "outlined"}
                        sx={{ fontWeight: 900 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Totale */}
              {hasScores && (
                <TableRow sx={{ backgroundColor: 'rgba(230,0,35,0.12)' }}>
                  <TableCell colSpan={showSprintColumn ? 8 : 7} align="right" sx={{ px: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      TOTALE
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ px: 1 }}>
                    <Typography variant="h6" color="primary">
                      {totalPoints}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Info collassabile */}
        <Box mt={2}>
          <Button
            size="small"
            onClick={() => setShowHelp(!showHelp)}
            startIcon={<Info />}
            endIcon={showHelp ? <ExpandLess /> : <ExpandMore />}
            sx={{ textTransform: 'none' }}
          >
            Come funziona
          </Button>
          
          <Collapse in={showHelp}>
            <Box
              mt={1}
              p={1.5}
              borderRadius={2}
              sx={{
                bgcolor: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <Typography variant="caption" component="div" gutterBottom>
                <strong>Formula:</strong> Base + Malus + Bonus Qual + Bonus Sprint = Totale
              </Typography>
              <Typography variant="caption" component="div" color="error" gutterBottom>
                <strong>Attenzione:</strong> vince chi fa MENO punti
              </Typography>
              
              <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                • <strong>Base:</strong> Posizione di arrivo nella gara principale
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Malus:</strong> |Previsione - Posizione reale| (solo gara principale)
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Bonus Qual:</strong> 1°: -5 | 2°: -3 | 3°: -2
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Bonus Sprint (solo MotoGP):</strong> 1°: -10 | 2°: -9 | 3°: -8 | ... | 10°: -1
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Non classificati:</strong> Ultimo + 1
              </Typography>
              
              <Box mt={1} p={1} bgcolor="background.paper" borderRadius={0.5}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Nota:</strong> La previsione vale solo per la gara principale. La Sprint assegna solo bonus ai primi 10 piloti MotoGP.
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 2 } }}>
        <Button onClick={onClose} size="small">Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}
