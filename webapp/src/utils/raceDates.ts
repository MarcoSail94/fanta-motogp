import { subDays } from 'date-fns';

interface RaceDateLike {
  gpDate: string;
  sprintDate?: string | null;
}

export function getSprintDate(race: RaceDateLike) {
  if (!race.sprintDate) return null;
  return subDays(new Date(race.gpDate), 1);
}

export function getLineupDeadlineDate(race: RaceDateLike) {
  return getSprintDate(race) || new Date(race.gpDate);
}
