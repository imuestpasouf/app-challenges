export type Zone = 'green' | 'amber' | 'red' | 'black';

export interface ZoneResult {
  zone: Zone;
  label: string;
}

/**
 * LA règle de couleur de l'app (validée, §6.2 du brief).
 * Pas de plancher de déficit : plus le déficit est grand, plus c'est vert.
 */
export function zone(balance: number): ZoneResult {
  if (balance <= -1000) return { zone: 'green', label: 'Excellent déficit' };
  if (balance <= 0) return { zone: 'amber', label: 'Déficit modéré' };
  if (balance <= 500) return { zone: 'red', label: 'Surplus' };
  return { zone: 'black', label: 'Gros surplus' };
}
