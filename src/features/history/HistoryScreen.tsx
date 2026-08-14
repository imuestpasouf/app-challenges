import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChallengeByCategory, listFields } from '../../api/challenges';
import { listEntries } from '../../api/entries';
import { zone } from '../../domain/calories';
import { monthlyAverage, totalAverage, weeklyAverage, type DailyBalance } from '../../domain/stats';
import { findBurnedField, findEatenField } from '../../lib/fieldMatch';
import { addDays, toDateKey, todayKey } from '../../lib/date';
import { ZONE_HEX } from '../../lib/color';

const WINDOW_DAYS = 40;
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const LEGEND: [keyof typeof ZONE_HEX, string][] = [
  ['green', '≤ −1000'],
  ['amber', '−1000 → 0'],
  ['red', '0 → +500'],
  ['black', '> +500'],
];

function fmt(n: number) {
  return (n > 0 ? '+' : '') + Math.round(n);
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  wd: string;
  balance: number | null;
  isToday: boolean;
}

export function HistoryScreen() {
  const today = todayKey();

  const challengeQuery = useQuery({
    queryKey: ['challenges', 'sport'],
    queryFn: () => getChallengeByCategory('sport'),
  });
  const challenge = challengeQuery.data;

  const fieldsQuery = useQuery({
    queryKey: ['challenge-fields', challenge?.id],
    queryFn: () => listFields(challenge!.id),
    enabled: !!challenge,
  });
  const fields = fieldsQuery.data ?? [];
  const eatField = findEatenField(fields);
  const burnField = findBurnedField(fields);

  const rangeFrom = toDateKey(addDays(new Date(), -(WINDOW_DAYS - 1)));
  const entriesQuery = useQuery({
    queryKey: ['entries', challenge?.id, 'history', rangeFrom, today],
    queryFn: () => listEntries(challenge!.id, { from: rangeFrom, to: today }),
    enabled: !!challenge && !!eatField && !!burnField,
  });

  const days: CalendarDay[] = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const eatByDate = new Map<string, number>();
    const burnByDate = new Map<string, number>();
    for (const e of entries) {
      if (e.value === null) continue;
      const n = parseFloat(e.value);
      if (Number.isNaN(n)) continue;
      if (e.fieldId === eatField?.id) eatByDate.set(e.entryDate, n);
      if (e.fieldId === burnField?.id) burnByDate.set(e.entryDate, n);
    }
    const result: CalendarDay[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const date = addDays(new Date(), -i);
      const dateKey = toDateKey(date);
      const eat = eatByDate.get(dateKey);
      const burn = burnByDate.get(dateKey);
      result.push({
        date,
        dateKey,
        wd: WEEKDAY_SHORT[date.getDay()],
        balance: eat !== undefined && burn !== undefined ? Math.round(eat - burn) : null,
        isToday: dateKey === today,
      });
    }
    return result;
  }, [entriesQuery.data, eatField, burnField, today]);

  const balances: DailyBalance[] = days
    .filter((d) => d.balance !== null)
    .map((d) => ({ date: d.dateKey, balance: d.balance as number }));

  const now = new Date();
  const weekly = weeklyAverage(balances, now);
  const monthly = monthlyAverage(balances, now);
  const total = challenge ? totalAverage(balances, challenge.startDate, now) : { average: null, result: null };

  const daysWithData = balances.length;
  const deficitDays = balances.filter((b) => b.balance <= 0).length;

  let bestStreak = 0;
  let currentStreak = 0;
  for (const d of days) {
    if (d.balance !== null && zone(d.balance).zone === 'green') {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  const greenDays = balances.filter((b) => zone(b.balance).zone === 'green').length;

  const offset = (days[0].date.getDay() + 6) % 7;
  const columnCount = Math.ceil((offset + days.length) / 7);
  const columns: (CalendarDay | null)[][] = Array.from({ length: columnCount }, () => new Array(7).fill(null));
  days.forEach((day, i) => {
    const gi = offset + i;
    columns[Math.floor(gi / 7)][gi % 7] = day;
  });

  const last7 = [...days].slice(-7).reverse();

  if (challengeQuery.isLoading) {
    return <div className="px-4 py-6 text-sm text-muted">Chargement…</div>;
  }

  if (!challenge) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="font-heading text-lg font-bold text-ink">Aucun challenge sport</p>
        <p className="text-sm text-muted">
          Crée un challenge avec la catégorie <span className="font-mono text-ink">sport</span> pour voir l'historique.
        </p>
        <Link to="/challenges/new" className="font-mono text-sm text-brand underline">
          Créer un challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <div className="pb-4">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-2">Ton parcours</p>
        <h1 className="mt-0.5 font-heading text-[28px] font-black leading-none tracking-tight text-ink">
          Historique <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">en couleurs</span>
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted">
          {daysWithData} jours enregistrés · {deficitDays} en déficit
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        {[
          { label: '7 JOURS', avg: weekly.average, z: weekly.result },
          { label: '30 JOURS', avg: monthly.average, z: monthly.result },
          { label: 'TOTAL', avg: total.average, z: total.result },
        ].map((v) => (
          <div key={v.label} className="relative flex-1 overflow-hidden rounded-2xl border border-line bg-card p-3 shadow-sm">
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-wide text-muted-2">{v.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              {v.z && <span className="h-1.5 w-1.5 rounded-full" style={{ background: ZONE_HEX[v.z.zone] }} />}
              <span className="font-heading text-xl font-extrabold tabular-nums text-ink">
                {v.avg !== null ? fmt(v.avg) : '–'}
              </span>
            </div>
            <div className="mt-1 text-[9px] font-semibold text-muted-2">kcal/jour</div>
            {v.z && <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: ZONE_HEX[v.z.zone] }} />}
          </div>
        ))}
      </div>

      <div className="mb-3.5 rounded-3xl border border-line bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-heading text-sm font-bold text-ink">Le mois, jour par jour</span>
          <span className="font-mono text-[10px] text-muted-2">
            {days[0].date.getDate()}/{days[0].date.getMonth() + 1} → {days[days.length - 1].date.getDate()}/
            {days[days.length - 1].date.getMonth() + 1}
          </span>
        </div>
        <div className="flex justify-center gap-1.5">
          <div className="mr-0.5 flex flex-col gap-1.5">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="flex h-[30px] w-[13px] items-center justify-center font-mono text-[9px] font-bold text-muted-2">
                {label}
              </span>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {col.map((day, ri) => {
                if (!day) return <div key={ri} className="h-[30px] w-[30px] rounded-lg bg-empty" />;
                const z = day.balance !== null ? zone(day.balance) : null;
                return (
                  <div
                    key={ri}
                    title={day.balance !== null ? `${day.wd} ${day.date.getDate()}/${day.date.getMonth() + 1} · ${fmt(day.balance)} kcal` : undefined}
                    className={`h-[30px] w-[30px] rounded-lg ${day.isToday ? 'outline outline-[2.5px] outline-offset-2 outline-brand' : ''}`}
                    style={{ background: z ? ZONE_HEX[z.zone] : 'var(--color-empty)' }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4.5 flex flex-wrap justify-center gap-3">
          {LEGEND.map(([c, label]) => (
            <div key={c} className="flex items-center gap-1.5 text-[10px] text-muted">
              <i className="h-[9px] w-[9px] rounded" style={{ background: ZONE_HEX[c] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mb-4 flex items-center gap-3.5 rounded-2xl p-4 shadow-card"
        style={{ background: `linear-gradient(120deg, #111726, #1E2740)` }}
      >
        <span className="text-2xl leading-none">🔥</span>
        <div className="flex-1">
          <b className="block font-heading text-[15px] font-extrabold text-white">Meilleure série verte</b>
          <span className="font-mono text-[11.5px] text-[#AEB7CC]">{greenDays} jours "excellents" sur la période</span>
        </div>
        <div className="text-right font-heading text-[28px] font-black leading-none text-white">
          {bestStreak}
          <small className="mt-0.5 block font-mono text-[9px] font-semibold tracking-wide text-[#AEB7CC]">JOURS</small>
        </div>
      </div>

      <div className="mb-2 flex items-baseline justify-between px-1">
        <b className="font-heading text-[15px] font-extrabold text-ink">Détail</b>
        <span className="text-[11px] text-muted-2">7 derniers jours</span>
      </div>
      <div className="mb-4 rounded-2xl border border-line bg-card px-4 shadow-sm">
        {last7.map((day, i) => {
          const z = day.balance !== null ? zone(day.balance) : null;
          return (
            <div
              key={day.dateKey}
              className={`flex items-center justify-between py-2.5 text-sm font-medium ${i < last7.length - 1 ? 'border-b border-line-2' : ''}`}
            >
              <div className="flex items-center gap-2.5 text-muted">
                <i className="h-[11px] w-[11px] rounded" style={{ background: z ? ZONE_HEX[z.zone] : 'var(--color-empty)' }} />
                {day.wd} {day.date.getDate()}/{day.date.getMonth() + 1}
                {day.isToday && " · aujourd'hui"}
              </div>
              <b className="font-heading tabular-nums" style={{ color: z ? ZONE_HEX[z.zone] : 'var(--color-muted-2)' }}>
                {day.balance !== null ? `${fmt(day.balance)} kcal` : '–'}
              </b>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-2">
        Chaque tuile = la balance d'un jour, colorée selon ta règle. Les moyennes suivent la même logique.
      </p>
    </div>
  );
}
