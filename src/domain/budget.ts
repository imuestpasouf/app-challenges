export type BudgetZone = 'green' | 'amber' | 'red';

export interface BudgetProgress {
  pct: number;
  remaining: number;
  zone: BudgetZone;
  overspent: boolean;
}

export function budgetProgress(spent: number, budget: number): BudgetProgress {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const zone: BudgetZone = pct < 60 ? 'green' : pct < 85 ? 'amber' : 'red';
  return { pct, remaining, zone, overspent: remaining < 0 };
}
