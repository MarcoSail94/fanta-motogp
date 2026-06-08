import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Stack, Chip, IconButton, Alert, CircularProgress
} from '@mui/material';
import { Edit, Save, Cancel, CheckCircle, Pending } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getPastRacesWithStatus, getResultsTemplate, postRaceResults } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { queryKeys } from '../../services/queryKeys';

interface Race {
  id: string;
  name: string;
  gpDate: string;
  hasResults: boolean;
}

interface RiderResult {
  riderId: string;
  riderName: string;
  riderNumber: number;
  position: number | null;
  status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
}

export default function RaceResultsManager() {
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'MOTOGP' | 'MOTO2' | 'MOTO3'>('MOTOGP');
  const [sessionType, setSessionType] = useState<'RACE' | 'SPRINT'>('RACE');
  const [results, setResults] = useState<RiderResult[]>([]);

  const { data: racesData, isLoading: isLoadingRaces } = useQuery<{ races: Race[] }>({
    queryKey: queryKeys.admin.races,
    queryFn: getPastRacesWithStatus,
  });

  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: queryKeys.admin.resultsTemplate(selectedRace?.id, selectedCategory),
    queryFn: () => getResultsTemplate(selectedRace!.id, selectedCategory),
    enabled: !!selectedRace,
  });

  useEffect(() => {
    if (templateData?.template) {
      setResults(templateData.template.map((r: any) => ({ ...r, position: r.position || '' })));
    }
  }, [templateData]);

  const saveResultsMutation = useMutation({
    mutationFn: (data: { raceId: string; results: RiderResult[], session: 'RACE' | 'SPRINT' }) => postRaceResults(data),
    onSuccess: () => {
      notify('Risultati salvati e punteggi ricalcolati!', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.races });
      queryClient.invalidateQueries({ queryKey: queryKeys.races.resultsRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.races.qualifyingRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.lineupsRoot });
      setSelectedRace(null);
      setResults([]);
    },
    onError: (err: any) => notify(err.response?.data?.error || 'Errore salvataggio risultati', 'error'),
  });

  const handleResultChange = (riderId: string, field: 'position' | 'status', value: any) => {
    setResults(prev =>
      prev.map(r =>
        r.riderId === riderId
          ? {
              ...r,
              [field]: value,
              ...(field === 'status' && value !== 'FINISHED' && { position: null }),
              ...(field === 'position' && { status: 'FINISHED' }),
            }
          : r
      )
    );
  };

  const handleSave = () => {
    if (!selectedRace) return;
    const finalResults = results
      .filter(r => r.position || r.status !== 'FINISHED')
      .map(r => ({ ...r, position: Number(r.position) || null }));
      
    saveResultsMutation.mutate({ raceId: selectedRace.id, results: finalResults, session: sessionType });
  };

  if (isLoadingRaces) return <CircularProgress />;

  if (selectedRace) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Inserisci Risultati per: {selectedRace.name}</Typography>
        <Stack direction="row" spacing={2} my={2}>
          <FormControl>
            <InputLabel>Categoria</InputLabel>
            <Select value={selectedCategory} label="Categoria" onChange={e => setSelectedCategory(e.target.value as any)}>
              <MenuItem value="MOTOGP">MotoGP</MenuItem>
              <MenuItem value="MOTO2">Moto2</MenuItem>
              <MenuItem value="MOTO3">Moto3</MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Sessione</InputLabel>
            <Select value={sessionType} label="Sessione" onChange={e => setSessionType(e.target.value as any)}>
              <MenuItem value="RACE">Gara</MenuItem>
              <MenuItem value="SPRINT">Sprint</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        
        {isLoadingTemplate ? <CircularProgress /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pilota</TableCell>
                  <TableCell>Posizione</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map(r => (
                  <TableRow key={r.riderId}>
                    <TableCell>{r.riderName} (#{r.riderNumber})</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        variant="standard"
                        value={r.position || ''}
                        onChange={e => handleResultChange(r.riderId, 'position', e.target.value)}
                        disabled={r.status !== 'FINISHED'}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        variant="standard"
                        value={r.status}
                        onChange={e => handleResultChange(r.riderId, 'status', e.target.value)}
                      >
                        <MenuItem value="FINISHED">Arrivato</MenuItem>
                        <MenuItem value="DNF">DNF</MenuItem>
                        <MenuItem value="DNS">DNS</MenuItem>
                        <MenuItem value="DSQ">DSQ</MenuItem>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack direction="row" spacing={2} mt={3}>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saveResultsMutation.isPending}>
            Salva Risultati
          </Button>
          <Button variant="outlined" startIcon={<Cancel />} onClick={() => setSelectedRace(null)}>
            Annulla
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Gara</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Risultati</TableCell>
            <TableCell align="right">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {racesData?.races.map((race: Race) => (
            <TableRow key={race.id} hover>
              <TableCell>{race.name}</TableCell>
              <TableCell>{format(new Date(race.gpDate), 'dd MMM yyyy', { locale: it })}</TableCell>
              <TableCell>
                <Chip
                  label={race.hasResults ? 'Inseriti' : 'Mancanti'}
                  color={race.hasResults ? 'success' : 'warning'}
                  size="small"
                  icon={race.hasResults ? <CheckCircle /> : <Pending />}
                />
              </TableCell>
              <TableCell align="right">
                <Button startIcon={<Edit />} onClick={() => setSelectedRace(race)}>
                  Gestisci
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
