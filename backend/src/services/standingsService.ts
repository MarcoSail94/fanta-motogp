import type { PrismaClient } from '@prisma/client';

export type StandingTrend = 'up' | 'down' | 'same' | null;

export interface StandingScoreInput {
  totalPoints: number;
  raceId: string;
  race: {
    gpDate: Date;
  };
}

export interface StandingTeamInput {
  id: string;
  name: string;
  userId: string;
  startingPoints: number | null;
  user: {
    username: string;
  };
  scores: StandingScoreInput[];
}

export interface LeagueStanding {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints: number | null;
  gamesPlayed: number;
  position: number;
  trend: StandingTrend;
}

export const calculateTotalPoints = (
  startingPoints: number | null | undefined,
  racePoints: number
) => (startingPoints ?? 0) + racePoints;

const compareStandings = (
  a: Pick<LeagueStanding, 'teamId' | 'teamName' | 'totalPoints'>,
  b: Pick<LeagueStanding, 'teamId' | 'teamName' | 'totalPoints'>
) => {
  const pointsDifference = a.totalPoints - b.totalPoints;
  if (pointsDifference !== 0) return pointsDifference;

  const nameDifference = a.teamName.localeCompare(b.teamName, 'it', { sensitivity: 'base' });
  return nameDifference !== 0 ? nameDifference : a.teamId.localeCompare(b.teamId);
};

const getLatestRaceId = (teams: readonly StandingTeamInput[]) => {
  let latestRaceId: string | null = null;
  let latestRaceTime = Number.NEGATIVE_INFINITY;

  for (const team of teams) {
    for (const score of team.scores) {
      const raceTime = score.race.gpDate.getTime();
      if (raceTime > latestRaceTime) {
        latestRaceId = score.raceId;
        latestRaceTime = raceTime;
      }
    }
  }

  return latestRaceId;
};

export const buildLeagueStandings = (
  teams: readonly StandingTeamInput[]
): LeagueStanding[] => {
  const latestRaceId = getLatestRaceId(teams);
  const raceIds = new Set(teams.flatMap(team => team.scores.map(score => score.raceId)));
  const hasPreviousRace = latestRaceId !== null && [...raceIds].some(raceId => raceId !== latestRaceId);

  const previousPositions = new Map<string, number>();
  if (hasPreviousRace) {
    teams
      .map(team => {
        const previousRacePoints = team.scores
          .filter(score => score.raceId !== latestRaceId)
          .reduce((sum, score) => sum + score.totalPoints, 0);

        return {
          teamId: team.id,
          teamName: team.name,
          totalPoints: calculateTotalPoints(team.startingPoints, previousRacePoints)
        };
      })
      .sort(compareStandings)
      .forEach((team, index) => previousPositions.set(team.teamId, index + 1));
  }

  return teams
    .map(team => {
      const racePoints = team.scores.reduce((sum, score) => sum + score.totalPoints, 0);
      const latestRaceScores = latestRaceId
        ? team.scores.filter(score => score.raceId === latestRaceId)
        : [];

      return {
        teamId: team.id,
        teamName: team.name,
        userId: team.userId,
        userName: team.user.username,
        totalPoints: calculateTotalPoints(team.startingPoints, racePoints),
        lastRacePoints: latestRaceScores.length > 0
          ? latestRaceScores.reduce((sum, score) => sum + score.totalPoints, 0)
          : null,
        gamesPlayed: new Set(team.scores.map(score => score.raceId)).size,
        position: 0,
        trend: null as StandingTrend
      };
    })
    .sort(compareStandings)
    .map((team, index) => {
      const position = index + 1;
      const previousPosition = previousPositions.get(team.teamId);
      let trend: StandingTrend = null;

      if (previousPosition !== undefined) {
        if (position < previousPosition) trend = 'up';
        else if (position > previousPosition) trend = 'down';
        else trend = 'same';
      }

      return { ...team, position, trend };
    });
};

export const loadLeagueStandings = async (
  prisma: PrismaClient,
  leagueId: string
) => {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: {
      id: true,
      name: true,
      userId: true,
      startingPoints: true,
      user: {
        select: { username: true }
      },
      scores: {
        select: {
          totalPoints: true,
          raceId: true,
          race: {
            select: { gpDate: true }
          }
        }
      }
    }
  });

  return buildLeagueStandings(teams);
};
