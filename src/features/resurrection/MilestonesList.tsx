import { milestoneState } from '../../domain/resurrection';
import type { ResurrectionMilestone, ResurrectionMode, WeightEntry } from '../../domain/types';
import { formatShortFr, toDateKey } from '../../lib/date';

interface Item {
  key: string;
  targetDate: Date;
  targetWeight: number;
  label: string;
}

function weightAtOrBefore(weightEntries: WeightEntry[], dateKey: string): number | null {
  let found: number | null = null;
  for (const entry of weightEntries) {
    if (entry.entryDate > dateKey) break;
    found = entry.weight;
  }
  return found;
}

interface MilestonesListProps {
  mode: ResurrectionMode;
  milestones: ResurrectionMilestone[];
  weightEntries: WeightEntry[];
  currentWeight: number;
}

export function MilestonesList({ mode, milestones, weightEntries, currentWeight }: MilestonesListProps) {
  const today = new Date();

  const items: Item[] = [
    ...[...milestones].sort((a, b) => a.position - b.position).map((m, i) => ({ key: m.id, targetDate: new Date(m.targetDate), targetWeight: m.targetWeight, label: `Jalon ${i + 1}` })),
    { key: 'final', targetDate: new Date(mode.endDate), targetWeight: mode.targetWeight, label: 'Objectif final' },
  ];

  let firstUpcomingFound = false;

  return (
    <>
      <div className="lbl">
        <span>JALONS</span>
        <span>{items.length} paliers</span>
      </div>
      <div>
        {items.map((item) => {
          const dateKey = toDateKey(item.targetDate);
          const weightAtDate = item.targetDate < today ? weightAtOrBefore(weightEntries, dateKey) : null;
          const isFirstUpcoming = item.targetDate >= today && !firstUpcomingFound;
          if (isFirstUpcoming) firstUpcomingFound = true;
          const state = milestoneState({ id: item.key, modeId: mode.id, targetDate: dateKey, targetWeight: item.targetWeight, position: 0, reached: null, reachedWeight: null }, today, weightAtDate, isFirstUpcoming);

          const daysTo = Math.round((item.targetDate.getTime() - today.getTime()) / 86_400_000);
          let icon = '○';
          let rn: string | number = daysTo;
          let rl = 'JOURS';
          let sub = formatShortFr(item.targetDate);
          let bg = 'rgba(255,255,255,.04)';

          if (state === 'done') {
            icon = '✓';
            rn = weightAtDate !== null ? weightAtDate.toFixed(1) : '–';
            rl = 'ATTEINT';
            sub = `Réussi le ${formatShortFr(item.targetDate)}`;
            bg = 'rgba(29,166,90,.14)';
          } else if (state === 'missed') {
            icon = '✕';
            rn = weightAtDate !== null ? weightAtDate.toFixed(1) : '–';
            rl = 'ATTEINT';
            sub = `Manqué · ${formatShortFr(item.targetDate)}`;
            bg = 'rgba(224,49,39,.14)';
          } else if (state === 'current') {
            icon = '🎯';
            const need = currentWeight - item.targetWeight;
            const pace = need > 0 && daysTo > 0 ? (need / daysTo) * 7 : 0;
            sub = `${formatShortFr(item.targetDate)} · ${need > 0 ? `${need.toFixed(1)} kg · ${pace.toFixed(2)} kg/sem` : 'déjà atteint'}`;
            bg = 'rgba(125,140,255,.16)';
          }

          return (
            <div className="glass ms" key={item.key} style={{ background: bg }}>
              <div className="ic" style={{ background: 'rgba(255,255,255,.09)' }}>
                {icon}
              </div>
              <div className="m">
                <b>
                  {item.targetWeight.toFixed(1)} kg — {item.label}
                </b>
                <span>{sub}</span>
              </div>
              <div className="r">
                <div className="n">{rn}</div>
                <div className="l">{rl}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
