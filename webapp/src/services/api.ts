// webapp/src/services/api.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token di autenticazione
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor per gestire errori globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-error'));
    }
    return Promise.reject(error);
  }
);


// Auth
export const login = (data: any) => api.post('/auth/login', data);
export const register = (data: any) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = async (data: { username?: string; email?: string }) => {
  const response = await api.put('/auth/profile', data);
  return response.data;
};
export const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
  const response = await api.post('/auth/change-password', data);
  return response.data;
};


// Teams
export const getMyTeams = async () => {
  const response = await api.get('/teams/my-teams');
  return response.data;
};

export const createTeam = async (data: { 
  name: string; 
  leagueId: string; 
  riderIds: string[] 
}) => {
  const response = await api.post('/teams', data);
  return response.data;
};

export const getTeamById = async (teamId: string) => {
  const response = await api.get(`/teams/${teamId}`);
  return response.data;
};

export const updateTeam = async (teamId: string, data: {
  name?: string;
  riderIds?: string[];
}) => {
  const response = await api.put(`/teams/${teamId}`, data);
  return response.data;
};

export const getMyTeamInLeague = async (leagueId: string) => {
  const response = await api.get(`/teams/my-team/${leagueId}`);
  return response.data;
};

// Leagues
export const getMyLeagues = async () => {
  const response = await api.get('/leagues/my-leagues');
  return response.data;
};

export const getPublicLeagues = async () => {
  const response = await api.get('/leagues/public');
  return response.data;
};

export const getLeagueDetails = async (leagueId: string) => {
  const response = await api.get(`/leagues/${leagueId}`);
  return response.data;
};

export const createLeague = async (data: {
  name: string;
  isPrivate: boolean;
  maxTeams: number;
  budget: number;
  scoringRules?: any;
}) => {
  const response = await api.post('/leagues', data);
  return response.data;
};

export const joinLeague = async (code: string) => {
  const response = await api.post('/leagues/join', { code });
  return response.data;
};

export const updateLeagueSettings = async (leagueId: string, settings: any) => {
  const response = await api.put(`/leagues/${leagueId}/settings`, settings);
  return response.data;
};

// Races
export const getAllRaces = async (year?: number) => {
  const response = await api.get('/races/calendar/' + (year || new Date().getFullYear()));
  return response.data;
};

export const getUpcomingRaces = async () => {
  const response = await api.get('/races/upcoming');
  return response.data;
};

export const getRaceById = async (raceId: string) => {
  const response = await api.get(`/races/${raceId}`);
  return response.data;
};

export const getPastRaces = async () => {
  const response = await api.get('/races/past');
  return response.data;
};

export const getRaceResults = async (raceId: string, session?: 'race' | 'sprint' | 'fp1' | 'fp2' | 'pr') => {
  const response = await api.get(`/races/${raceId}/results`, { params: { session } });
  return response.data;
};

export const getQualifyingResults = async (raceId: string) => {
  const response = await api.get(`/races/${raceId}/qualifying`);
  return response.data;
};

export const getLatestRaceScoresStatus = async () => {
  const response = await api.get('/races/latest-scores-status');
  return response.data;
};

// Stats
export const getMyStats = async () => {
  const response = await api.get('/stats/my-stats');
  return response.data;
};

// Riders
export const getRiders = async (params?: {
  category?: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  search?: string;
  sortBy?: 'value' | 'points' | 'name';
  limit?: number;
}) => {
  const response = await api.get('/riders/web', { params });
  return response.data;
};

export const getRiderById = async (riderId: string) => {
  const response = await api.get(`/riders/${riderId}`);
  return response.data;
};

export const getRiderStats = async (riderId: string, season?: number) => {
  const response = await api.get(`/riders/${riderId}/stats`, {
    params: { season }
  });
  return response.data;
};

// Lineups
export const getLineup = async (teamId: string, raceId: string) => {
  const response = await api.get(`/lineups/${raceId}`, {
    params: { teamId }
  });
  return response.data;
};

export const setLineup = async (raceId: string, lineupData: any) => {
  const response = await api.post(`/lineups/${raceId}`, lineupData);
  return response.data;
};

export const getLeagueRaceLineups = async (leagueId: string, raceId: string) => {
    const response = await api.get(`/leagues/web/${leagueId}/race/${raceId}/lineups`);
    return response.data;
};

// Admin / Sync
export const getSyncStatus = async () => {
  const response = await api.get('/sync/status');
  return response.data;
};

export const syncRiders = async () => {
  const response = await api.post('/sync/riders');
  return response.data;
};

export const syncCalendar = async (year: number) => {
  const response = await api.post('/sync/calendar', { year });
  return response.data;
};

export const syncRaceResults = async (raceId: string) => {
  const response = await api.post(`/sync/race-results/${raceId}`);
  return response.data;
};

export const getPastRacesWithStatus = async () => {
  return getPastRaces();
};

export const getResultsTemplate = async (raceId: string, category: string) => {
  const response = await api.get(`/sync/results/template/${raceId}/${category}`);
  return response.data;
};

export const postRaceResults = async (data: { raceId: string; results: any[]; session: 'RACE' | 'SPRINT' }) => {
  const response = await api.post('/sync/results', data);
  return response.data;
};

export default api;