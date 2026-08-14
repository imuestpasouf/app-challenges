export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function diffDays(from: Date, to: Date): number {
  const ms = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round(ms / 86_400_000);
}

const EYEBROW_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function formatEyebrowDate(date: Date): string {
  const s = EYEBROW_FORMAT.format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SHORT_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export function formatShortFr(date: Date): string {
  return SHORT_FORMAT.format(date).replace('.', '');
}

const LONG_DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

export function formatDateSeparator(date: Date): string {
  const today = new Date();
  if (toDateKey(date) === toDateKey(today)) return "AUJOURD'HUI";
  if (toDateKey(date) === toDateKey(addDays(today, -1))) return 'HIER';
  return LONG_DAY_FORMAT.format(date).toUpperCase();
}
