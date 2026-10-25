export interface RiderPick {
  rider: string;
  riderCategory: string;
  points: number;
  predicted: number | null;
  actual: number | string | null;
}

const toPick = (score: any): RiderPick => ({
  rider: score.rider,
  riderCategory: score.riderCategory,
  points: score.points,
  predicted: score.predicted ?? null,
  actual: score.actual ?? null,
});

// Scelta migliore e peggiore della giornata dai riderScores salvati nel TeamScore:
// vince chi fa meno punti, i piloti esclusi (gara annullata) non contano
export const pickBestAndWorst = (riderScores: unknown) => {
  const scores = Array.isArray(riderScores)
    ? riderScores.filter((score: any) => score && !score.excluded && typeof score.points === 'number')
    : [];

  if (scores.length === 0) return { bestPick: null, worstPick: null };

  const best = scores.reduce((a: any, b: any) => (b.points < a.points ? b : a));
  const worst = scores.reduce((a: any, b: any) => (b.points > a.points ? b : a));

  return {
    bestPick: toPick(best),
    worstPick: worst === best ? null : toPick(worst),
  };
};
