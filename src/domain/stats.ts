import { zone, type ZoneResult } from './calories';

export interface DailyBalance {
  date: string; // YYYY-MM-DD
  balance: number;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function withinLastNDays(entries: DailyBalance[], today: Date, days: number): number[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return entries
    .filter((e) => {
      const d = new Date(e.date);
      return d >= cutoff && d <= today;
    })
    .map((e) => e.balance);
}

/**
 * Moyenne des balances (kcal) sur les 7 derniers jours, puis zone() appliquée au résultat.
 * On moyenne les balances, jamais les catégories de couleur (§6.3).
 */
export function rollingAverage(
  entries: DailyBalance[],
  today: Date,
  days: number
): { average: number | null; result: ZoneResult | null } {
  const avg = average(withinLastNDays(entries, today, days));
  return { average: avg, result: avg === null ? null : zone(avg) };
}

export function weeklyAverage(entries: DailyBalance[], today: Date) {
  return rollingAverage(entries, today, 7);
}

export function monthlyAverage(entries: DailyBalance[], today: Date) {
  return rollingAverage(entries, today, 30);
}

export function totalAverage(entries: DailyBalance[], challengeStartDate: string, today: Date) {
  const start = new Date(challengeStartDate);
  const values = entries
    .filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= today;
    })
    .map((e) => e.balance);
  const avg = average(values);
  return { average: avg, result: avg === null ? null : zone(avg) };
}
