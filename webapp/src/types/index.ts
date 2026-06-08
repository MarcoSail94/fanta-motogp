export type Category = 'MOTOGP' | 'MOTO2' | 'MOTO3';
export type RiderType = 'OFFICIAL' | 'REPLACEMENT' | 'WILDCARD' | 'TEST_RIDER';
export type SessionType = 'SPRINT' | 'RACE' | 'QUALIFYING' | 'FP1' | 'FP2' | 'PR';
export type RaceStatus = 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
export type LeagueRole = 'ADMIN' | 'MEMBER';
export type LineupVisibility = 'ALWAYS_VISIBLE' | 'AFTER_DEADLINE';

export interface User {
  id: string;
  email: string;
  username: string;
  credits: number;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: Category;
  nationality?: string;
  value: number;
  photoUrl?: string | null;
  isActive?: boolean;
  riderType: RiderType;
  totalPoints?: number;
  averagePoints?: number;
}

export interface TeamRider {
  id?: string;
  teamId?: string;
  riderId: string;
  purchasePrice?: number;
  rider: Rider;
}

export interface League {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  maxTeams: number;
  budget: number;
  teamsLocked: boolean;
  lineupVisibility?: LineupVisibility;
  currentTeams?: number;
  createdAt?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Team {
  id: string;
  name: string;
  userId: string;
  leagueId: string;
  league: League;
  riders: TeamRider[];
  totalPoints?: number;
  remainingBudget?: number;
  startingPoints?: number;
  hasLineup?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  startDate: string;
  endDate: string;
  gpDate: string;
  sprintDate?: string | null;
  round: number;
  season: number;
  trackLayoutUrl?: string | null;
  hasResults?: boolean;
}

export interface LineupRider {
  id: string;
  lineupId?: string;
  riderId: string;
  rider: Rider;
  predictedPosition: number;
}

export interface RaceLineup {
  id: string;
  teamId: string;
  raceId: string;
  isFallback?: boolean;
  lineupRiders: LineupRider[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RaceResult {
  id: string;
  raceId: string;
  riderId: string;
  rider: Rider;
  session: SessionType;
  position: number | null;
  points: number;
  status: RaceStatus;
  time?: string | null;
  totalLaps?: number | null;
  bestLap?: unknown;
}

export interface Standing {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints?: number | null;
  gamesPlayed?: number;
  position?: number;
  trend?: 'up' | 'down' | 'same' | null;
}

export interface ApiResponse<T> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
