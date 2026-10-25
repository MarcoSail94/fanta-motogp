const DAY_MS = 24 * 60 * 60 * 1000;

// La finestra apre un giorno prima dell'inizio del weekend e resta aperta due giorni dopo la fine:
// copre il calcolo del lunedì anche quando GitHub Actions fa partire il cron con ore di ritardo.
export const RACE_WEEKEND_LEAD_MS = DAY_MS;
export const RACE_WEEKEND_GRACE_MS = 2 * DAY_MS;

export interface RaceWeekendDates {
  startDate: Date;
  endDate: Date;
}

export const getRaceWeekendBounds = (now: Date) => ({
  // Il weekend deve iniziare entro questa data...
  startsBefore: new Date(now.getTime() + RACE_WEEKEND_LEAD_MS),
  // ...e finire dopo questa
  endsAfter: new Date(now.getTime() - RACE_WEEKEND_GRACE_MS),
});

export const isInRaceWeekendWindow = (race: RaceWeekendDates, now: Date) => {
  const { startsBefore, endsAfter } = getRaceWeekendBounds(now);
  return race.startDate <= startsBefore && race.endDate >= endsAfter;
};

// Se due finestre si sovrappongono ha precedenza il weekend iniziato prima, che è quello ancora da chiudere
export const findRaceWeekend = <T extends RaceWeekendDates>(races: readonly T[], now: Date): T | null =>
  races
    .filter(race => isInRaceWeekendWindow(race, now))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? null;
