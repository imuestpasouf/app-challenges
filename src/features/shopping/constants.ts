export const EXPENSE_CATEGORIES = ['courses', 'resto', 'transport', 'maison', 'loisirs', 'sante', 'autre'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_ICON: Record<string, string> = {
  courses: '🛒',
  resto: '🍽️',
  transport: '🚗',
  maison: '🏠',
  loisirs: '🎬',
  sante: '💊',
  autre: '💳',
};

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  courses: 'Courses',
  resto: 'Restaurant',
  transport: 'Transport',
  maison: 'Maison',
  loisirs: 'Loisirs',
  sante: 'Santé',
  autre: 'Autre',
};

export function eur(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
