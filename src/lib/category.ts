export type CategoryIcon = 'check' | 'book' | 'language';

export interface CategoryStyle {
  icon: CategoryIcon;
  iconBg: string;
  iconFg: string;
  barColor: string;
  textColor: string;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function categoryStyle(category: string): CategoryStyle {
  const n = normalize(category);
  if (n.includes('sport') || n.includes('poids') || n.includes('fitness')) {
    return { icon: 'check', iconBg: 'var(--color-green-bg)', iconFg: 'var(--color-green)', barColor: 'var(--color-green)', textColor: 'var(--color-green)' };
  }
  if (n.includes('lect') || n.includes('livre') || n.includes('read')) {
    return { icon: 'book', iconBg: 'var(--color-brand-bg)', iconFg: 'var(--color-brand)', barColor: 'var(--color-brand)', textColor: 'var(--color-brand)' };
  }
  if (n.includes('lang') || n.includes('espagn') || n.includes('angl')) {
    return { icon: 'language', iconBg: '#F3EAFE', iconFg: 'var(--color-brand-2)', barColor: 'var(--color-brand-2)', textColor: 'var(--color-brand-2)' };
  }
  return { icon: 'check', iconBg: 'var(--color-brand-bg)', iconFg: 'var(--color-brand)', barColor: 'var(--color-brand)', textColor: 'var(--color-brand)' };
}
