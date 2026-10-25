// saveRaceResults salva i piloti non classificati (DNF, DNS, DSQ...) con posizione 100+ per
// conservarne l'ordine nel DB. Fuori dal backend la loro posizione è null e vale lo status.
export const NOT_CLASSIFIED_POSITION_BASE = 100;

export const isClassifiedPosition = (position: number | null | undefined): position is number =>
  typeof position === 'number' && position > 0 && position < NOT_CLASSIFIED_POSITION_BASE;

export const toPublicPosition = (position: number | null | undefined) =>
  isClassifiedPosition(position) ? position : null;

export const withPublicPosition = <T extends { position: number | null }>(result: T): T => ({
  ...result,
  position: toPublicPosition(result.position),
});
