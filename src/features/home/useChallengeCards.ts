import { useQueries } from '@tanstack/react-query';
import type { Challenge, ChallengeField } from '../../domain/types';
import { listFields } from '../../api/challenges';
import { listEntries } from '../../api/entries';
import { findBurnedField, findEatenField } from '../../lib/fieldMatch';
import { zone, type ZoneResult } from '../../domain/calories';
import { diffDays, todayKey } from '../../lib/date';

export interface ChallengeCardData {
  challenge: Challenge;
  fields: ChallengeField[];
  todayDone: boolean;
  daysElapsed: number;
  daysWithEntry: number;
  adherencePct: number;
  sportBalance: number | null;
  sportZone: ZoneResult | null;
}

async function loadChallengeCard(challenge: Challenge): Promise<ChallengeCardData> {
  const today = todayKey();
  const fields = await listFields(challenge.id);
  const requiredIds = fields.filter((f) => f.isRequired).map((f) => f.id);
  const entries = await listEntries(challenge.id, { from: challenge.startDate, to: today });

  const byDate = new Map<string, Map<string, string>>();
  for (const e of entries) {
    if (e.value === null || e.value.trim() === '') continue;
    if (!byDate.has(e.entryDate)) byDate.set(e.entryDate, new Map());
    byDate.get(e.entryDate)!.set(e.fieldId, e.value);
  }

  const isDayComplete = (date: string) => {
    const values = byDate.get(date);
    return requiredIds.length > 0 && !!values && requiredIds.every((id) => values.has(id));
  };

  const daysElapsed = Math.max(1, diffDays(new Date(challenge.startDate), new Date()) + 1);
  let daysWithEntry = 0;
  for (const date of byDate.keys()) {
    if (isDayComplete(date)) daysWithEntry += 1;
  }
  const todayDone = isDayComplete(today);

  let sportBalance: number | null = null;
  let sportZone: ZoneResult | null = null;
  if (challenge.category === 'sport') {
    const eatField = findEatenField(fields);
    const burnField = findBurnedField(fields);
    const todayValues = byDate.get(today);
    const eatStr = eatField && todayValues?.get(eatField.id);
    const burnStr = burnField && todayValues?.get(burnField.id);
    if (eatStr && burnStr) {
      const eat = parseFloat(eatStr);
      const burn = parseFloat(burnStr);
      if (!Number.isNaN(eat) && !Number.isNaN(burn)) {
        sportBalance = Math.round(eat - burn);
        sportZone = zone(sportBalance);
      }
    }
  }

  return {
    challenge,
    fields,
    todayDone,
    daysElapsed,
    daysWithEntry,
    adherencePct: Math.round((daysWithEntry / daysElapsed) * 100),
    sportBalance,
    sportZone,
  };
}

export function useChallengeCards(challenges: Challenge[]) {
  return useQueries({
    queries: challenges.map((c) => ({
      queryKey: ['challenge-card', c.id],
      queryFn: () => loadChallengeCard(c),
    })),
  });
}
