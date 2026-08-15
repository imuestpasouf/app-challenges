import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChallengeByCategory, listFields } from '../../api/challenges';
import { listEntries } from '../../api/entries';
import { zone } from '../../domain/calories';
import { monthlyAverage, totalAverage, weeklyAverage, type DailyBalance } from '../../domain/stats';
import { findBurnedField, findEatenField } from '../../lib/fieldMatch';
import { addDays, toDateKey, todayKey } from '../../lib/date';
import { ZONE_HEX, shade } from '../../lib/color';

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
    return <div className="screen note">Chargement…</div>;
  }

  if (!challenge) {
    return (
      <section className="page-enter screen" style={{ textAlign: 'center' }}>
        <div className="glass gcard">
          <p style={{ fontSize: 18, fontWeight: 700 }}>Aucun challenge sport</p>
          <p className="note" style={{ marginTop: 8 }}>
            Crée un challenge avec la catégorie <b>sport</b> pour voir l'historique.
          </p>
          <Link to="/challenges/new" style={{ color: 'var(--brand)', display: 'inline-block', marginTop: 12, fontWeight: 600 }}>
            Créer un challenge
          </Link>
        </div>
      </section>
    );
  }

  let cellIndex = 0;

  return (
    <section className="page-enter screen">
      <div className="ltitle">
        <div className="k">Ton parcours</div>
        <h1>
          Historique{' '}
          <span style={{ background: 'linear-gradient(120deg,var(--brand),var(--brand-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            en couleurs
          </span>
        </h1>
      </div>

      <div className="vitals">
        {[
          { label: '7 JOURS', avg: weekly.average, z: weekly.result },
          { label: '30 JOURS', avg: monthly.average, z: monthly.result },
          { label: 'TOTAL', avg: total.average, z: total.result },
        ].map((v) => (
          <div key={v.label} className="glass vital">
            <div className="vlab">{v.label}</div>
            <div className="vrow">
              {v.z && <span className="vdot" style={{ background: ZONE_HEX[v.z.zone] }} />}
              <span className="vval" style={{ color: v.z ? (v.z.zone === 'black' ? 'var(--label)' : shade(ZONE_HEX[v.z.zone], -14)) : 'var(--label)' }}>
                {v.avg !== null ? fmt(v.avg) : '–'}
              </span>
            </div>
            <div className="vunit">kcal/jour</div>
          </div>
        ))}
      </div>

      <div className="glass mcard">
        <div className="mtop">
          <b>Le mois, jour par jour</b>
          <span className="rng">
            {daysWithData} j · {deficitDays} déficit
          </span>
        </div>
        <div className="mosaic">
          <div className="wdcol">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="mcol">
              {col.map((day, ri) => {
                const delay = `${cellIndex++ * 11}ms`;
                if (!day) return <div key={ri} className="mcell" style={{ animationDelay: delay }} />;
                const z = day.balance !== null ? zone(day.balance) : null;
                return (
                  <div
                    key={ri}
                    title={day.balance !== null ? `${day.wd} ${day.date.getDate()}/${day.date.getMonth() + 1} · ${fmt(day.balance)} kcal` : undefined}
                    className={`mcell${day.balance !== null ? ' fill' : ''}${day.isToday ? ' today' : ''}`}
                    style={{ background: z ? ZONE_HEX[z.zone] : undefined, animationDelay: delay }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mleg">
          {LEGEND.map(([c, label]) => (
            <div key={c} className="lg">
              <i style={{ background: ZONE_HEX[c] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="insight">
        <span className="fl">🔥</span>
        <div className="it">
          <b>Meilleure série verte</b>
          <span>{greenDays} jours "excellents" sur la période</span>
        </div>
        <div className="big">
          {bestStreak}
          <small>JOURS</small>
        </div>
      </div>

      <div className="grouptitle">
        <span>DÉTAIL</span>
        <span>7 derniers jours</span>
      </div>
      <div className="glass glist2">
        {last7.map((day) => {
          const z = day.balance !== null ? zone(day.balance) : null;
          return (
            <div key={day.dateKey} className="r">
              <div className="lft">
                <i style={{ background: z ? ZONE_HEX[z.zone] : 'rgba(40,42,60,.09)' }} />
                {day.wd} {day.date.getDate()}/{day.date.getMonth() + 1}
                {day.isToday && " · aujourd'hui"}
              </div>
              <b style={{ color: z ? ZONE_HEX[z.zone] : 'var(--label-3)' }}>{day.balance !== null ? `${fmt(day.balance)} kcal` : '–'}</b>
            </div>
          );
        })}
      </div>

      <p className="note">Chaque tuile = la balance d'un jour, colorée selon ta règle. Les moyennes suivent la même logique.</p>
    </section>
  );
}
