import { supabase } from './supabase';
import type { ChallengeEntry } from '../domain/types';

interface ChallengeEntryRow {
  id: string;
  challenge_id: string;
  field_id: string;
  entry_date: string;
  value: string | null;
  created_at: string;
}

function toEntry(row: ChallengeEntryRow): ChallengeEntry {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    fieldId: row.field_id,
    entryDate: row.entry_date,
    value: row.value,
    createdAt: row.created_at,
  };
}

export async function listEntries(
  challengeId: string,
  range: { from: string; to: string }
): Promise<ChallengeEntry[]> {
  const { data, error } = await supabase
    .from('challenge_entries')
    .select('*')
    .eq('challenge_id', challengeId)
    .gte('entry_date', range.from)
    .lte('entry_date', range.to)
    .order('entry_date', { ascending: true });
  if (error) throw error;
  return (data as ChallengeEntryRow[]).map(toEntry);
}

export async function upsertEntry(input: {
  challengeId: string;
  fieldId: string;
  entryDate: string;
  value: string;
}): Promise<ChallengeEntry> {
  const { data, error } = await supabase
    .from('challenge_entries')
    .upsert(
      {
        challenge_id: input.challengeId,
        field_id: input.fieldId,
        entry_date: input.entryDate,
        value: input.value,
      },
      { onConflict: 'field_id,entry_date' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return toEntry(data as ChallengeEntryRow);
}
