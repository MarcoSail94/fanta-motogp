import { parseISO } from 'date-fns';

interface RaceDateLike {
  gpDate: string;
  sprintDate?: string | null;
}

export function getSprintDate(race: RaceDateLike) {
  if (!race.sprintDate) return null;
  return parseISO(race.sprintDate);
}

export function getGpDate(race: RaceDateLike) {
  return parseISO(race.gpDate);
}

export function getLineupDeadlineDate(race: RaceDateLike) {
  return getSprintDate(race) || getGpDate(race);
}
