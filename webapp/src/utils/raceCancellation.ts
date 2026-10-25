import type { Category, RaceCancellationStatus, SessionType } from '../types';

type RaceCancellationLike = Partial<RaceCancellationStatus> | null | undefined;

export const CATEGORY_LABELS: Record<Category, string> = {
  MOTOGP: 'MotoGP',
  MOTO2: 'Moto2',
  MOTO3: 'Moto3',
};

export const SESSION_LABELS: Record<SessionType, string> = {
  RACE: 'Gara',
  SPRINT: 'Sprint',
  QUALIFYING: 'Qualifiche',
  FP1: 'FP1',
  FP2: 'FP2',
  PR: 'PR',
};

export function formatCategoryList(categories: readonly Category[]) {
  const labels = categories.map((category) => CATEGORY_LABELS[category]);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function isSessionCancelled(race: RaceCancellationLike, category: Category, session: SessionType) {
  return race?.cancelledSessions?.some((item) => item.category === category && item.session === session) ?? false;
}

// Riepilogo dell'impatto sul fantagioco: categorie escluse o giornata annullata
export function getRaceCancellationNotice(race: RaceCancellationLike) {
  const categories = race?.cancelledRaceCategories ?? [];
  if (categories.length === 0) return null;

  if (race?.isCancelled) {
    return {
      severity: 'error' as const,
      shortLabel: 'Giornata annullata',
      title: 'Giornata annullata',
      description: 'Le gare di tutte le categorie sono state annullate: questa giornata non assegna punti e non conta in classifica.',
    };
  }

  const list = formatCategoryList(categories);
  return {
    severity: 'warning' as const,
    shortLabel: `${list} annullata`,
    title: `Gara ${list} annullata`,
    description: `I piloti ${list} non contano nel punteggio di questa giornata. Le altre categorie vengono conteggiate normalmente.`,
  };
}
