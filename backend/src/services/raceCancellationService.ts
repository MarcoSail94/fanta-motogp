import type { Category } from '@prisma/client';

export const SCORING_CATEGORIES: Category[] = ['MOTOGP', 'MOTO2', 'MOTO3'];

export type RaceScoringStatus = 'READY' | 'PENDING' | 'ANNULLED';

export interface RaceScoringPlan {
  status: RaceScoringStatus;
  scorableCategories: Category[];
  cancelledCategories: Category[];
  pendingCategories: Category[];
}

// Regola: una categoria con la gara annullata non conta nel punteggio della giornata,
// purché almeno una categoria abbia le classifiche necessarie. Se le gare di tutte
// le categorie sono annullate, la giornata è annullata.
export const buildRaceScoringPlan = (
  categoriesWithRaceResults: Iterable<Category>,
  cancelledRaceCategories: Iterable<Category>
): RaceScoringPlan => {
  const withResults = new Set(categoriesWithRaceResults);
  const cancelled = new Set(cancelledRaceCategories);

  const scorableCategories = SCORING_CATEGORIES.filter(category => withResults.has(category));
  const cancelledCategories = SCORING_CATEGORIES.filter(
    category => !withResults.has(category) && cancelled.has(category)
  );
  const pendingCategories = SCORING_CATEGORIES.filter(
    category => !withResults.has(category) && !cancelled.has(category)
  );

  let status: RaceScoringStatus = 'READY';
  if (pendingCategories.length > 0) status = 'PENDING';
  else if (scorableCategories.length === 0) status = 'ANNULLED';

  return { status, scorableCategories, cancelledCategories, pendingCategories };
};

export interface RaceCancellationInput {
  category: Category;
  session: string;
}

export const summarizeRaceCancellations = (cancellations: readonly RaceCancellationInput[]) => {
  const cancelledRaceCategories = SCORING_CATEGORIES.filter(category =>
    cancellations.some(c => c.category === category && c.session === 'RACE')
  );

  return {
    cancelledSessions: cancellations.map(({ category, session }) => ({ category, session })),
    cancelledRaceCategories,
    isCancelled: cancelledRaceCategories.length === SCORING_CATEGORIES.length,
  };
};

// Tra più sessioni dello stesso tipo (ripartenze dopo bandiera rossa) si usa quella con
// il numero più alto; se è annullata ma ne esiste una conclusa, vale l'ultima conclusa.
export const pickApiSession = <T extends { number?: number | null; status?: string }>(sessions: T[]): T | undefined => {
  const sorted = [...sessions].sort((a, b) => (b.number || 0) - (a.number || 0));
  const latest = sorted[0];
  if (latest?.status === 'CANCELLED') {
    return sorted.find(s => s.status === 'FINISHED') ?? latest;
  }
  return latest;
};
