export const queryKeys = {
  auth: {
    profile: ['profile'] as const,
    stats: ['myStats'] as const,
  },
  teams: {
    mine: ['myTeams'] as const,
    root: ['team'] as const,
    myInLeagueRoot: ['myTeamInLeague'] as const,
    detail: (teamId?: string) => ['team', teamId] as const,
    myInLeague: (leagueId?: string) => ['myTeamInLeague', leagueId] as const,
  },
  leagues: {
    root: ['league'] as const,
    mine: ['myLeagues'] as const,
    public: ['publicLeagues'] as const,
    lineupsRoot: ['leagueRaceLineups'] as const,
    detail: (leagueId?: string) => ['league', leagueId] as const,
    lineups: (leagueId?: string, raceId?: string | null) => ['leagueRaceLineups', leagueId, raceId] as const,
  },
  races: {
    root: ['race'] as const,
    allRoot: ['allRaces'] as const,
    all: (year?: number) => ['allRaces', year] as const,
    upcoming: ['upcomingRaces'] as const,
    latestScoresStatus: ['latestScoresStatus'] as const,
    detail: (raceId?: string) => ['race', raceId] as const,
    resultsRoot: ['raceResults'] as const,
    results: (raceId?: string) => ['raceResults', raceId] as const,
    qualifyingRoot: ['qualifyingResults'] as const,
    qualifying: (raceId?: string) => ['qualifyingResults', raceId] as const,
    practiceRoot: ['practiceResults'] as const,
    practice: (raceId?: string, session?: string) => ['practiceResults', raceId, session] as const,
  },
  riders: {
    all: ['allRiders'] as const,
    list: ['riders'] as const,
    detailRoot: ['riderDetails'] as const,
    detail: (riderId?: string) => ['riderDetails', riderId] as const,
  },
  lineups: {
    root: ['lineup'] as const,
    detail: (teamId?: string, raceId?: string) => ['lineup', teamId, raceId] as const,
  },
  admin: {
    races: ['adminRaces'] as const,
    resultsTemplate: (raceId?: string, category?: string) => ['resultsTemplate', raceId, category] as const,
  },
};

export type RealtimeEndpoint = 'leagues' | 'league-lineups' | 'races' | 'lineups' | 'teams' | 'riders';
