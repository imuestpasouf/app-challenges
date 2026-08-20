import type { MilestoneState, ResurrectionMilestone, ResurrectionMode, TrackStatus } from './types';

const DAY = 86_400_000;

export function dayIndex(date: Date, start: Date): number {
  return Math.round((date.getTime() - start.getTime()) / DAY);
}

export function totalDays(mode: ResurrectionMode): number {
  return dayIndex(new Date(mode.endDate), new Date(mode.startDate));
}

interface TrajectoryNode {
  day: number;
  weight: number;
}

/** Nœuds de la trajectoire : départ + jalons + objectif final */
export function trajectoryNodes(mode: ResurrectionMode, milestones: ResurrectionMilestone[]): TrajectoryNode[] {
  const start = new Date(mode.startDate);
  return [
    { day: 0, weight: mode.startWeight },
    ...[...milestones]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({ day: dayIndex(new Date(m.targetDate), start), weight: m.targetWeight })),
    { day: totalDays(mode), weight: mode.targetWeight },
  ];
}

/** Poids cible à un jour donné — interpolation linéaire PAR MORCEAUX entre jalons. */
export function targetAt(day: number, nodes: TrajectoryNode[]): number {
  if (day <= 0) return nodes[0].weight;
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    if (day <= b.day) {
      const t = (day - a.day) / (b.day - a.day);
      return a.weight + (b.weight - a.weight) * t;
    }
  }
  return nodes[nodes.length - 1].weight;
}

export interface Counters {
  daysLeft: number;
  kgLeft: number;
  elapsed: number;
  total: number;
  timeProgress: number;
}

/** Les deux chiffres du compteur */
export function counters(mode: ResurrectionMode, currentWeight: number, today: Date): Counters {
  const elapsed = dayIndex(today, new Date(mode.startDate));
  const total = totalDays(mode);
  return {
    daysLeft: Math.max(0, total - elapsed),
    kgLeft: Math.max(0, currentWeight - mode.targetWeight),
    elapsed,
    total,
    timeProgress: Math.min(100, (elapsed / total) * 100),
  };
}

export interface TrackStatusResult {
  gap: number;
  status: TrackStatus;
  weeklyPaceNeeded: number;
}

/** Écart à la trajectoire + rythme hebdo nécessaire sur le temps restant */
export function trackStatus(currentWeight: number, targetToday: number, targetFinal: number, daysLeft: number): TrackStatusResult {
  const gap = currentWeight - targetToday;
  const status: TrackStatus = gap <= 0 ? 'ahead' : gap <= 1 ? 'slightly_behind' : 'behind';
  const weeklyPaceNeeded = ((currentWeight - targetFinal) / Math.max(1, daysLeft)) * 7;
  return { gap, status, weeklyPaceNeeded };
}

/** État d'un jalon pour l'affichage */
export function milestoneState(
  milestone: ResurrectionMilestone,
  today: Date,
  weightAtDate: number | null,
  isFirstUpcoming: boolean
): MilestoneState {
  const due = new Date(milestone.targetDate);
  if (due < today) {
    return weightAtDate !== null && weightAtDate <= milestone.targetWeight ? 'done' : 'missed';
  }
  return isFirstUpcoming ? 'current' : 'upcoming';
}

export interface GeneratedMilestone {
  position: number;
  targetDate: Date;
  targetWeight: number;
}

/** Jalons auto-générés à la configuration (M-1 jalons pour M mois) */
export function generateMilestones(w0: number, wf: number, months: number, start: Date): GeneratedMilestone[] {
  const out: GeneratedMilestone[] = [];
  for (let i = 0; i < months - 1; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i + 1);
    out.push({
      position: i,
      targetDate: d,
      targetWeight: Math.round((w0 - (w0 - wf) * ((i + 1) / months)) * 10) / 10,
    });
  }
  return out;
}
