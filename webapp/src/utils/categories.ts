import type { Category } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  MOTOGP: 'MotoGP',
  MOTO2: 'Moto2',
  MOTO3: 'Moto3',
};

// Etichetta leggibile di una categoria (MOTOGP -> MotoGP); lascia invariati valori sconosciuti
export function categoryLabel(category?: string | null) {
  if (!category) return '-';
  return CATEGORY_LABELS[category as Category] ?? category;
}
