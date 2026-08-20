import { supabase } from './supabase';
import { toDateKey } from '../lib/date';
import type { GeneratedMilestone } from '../domain/resurrection';
import type { ResurrectionMilestone, ResurrectionMode, WeightEntry } from '../domain/types';

interface ResurrectionModeRow {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  start_weight: number;
  target_weight: number;
  status: ResurrectionMode['status'];
  created_at: string;
  ended_at: string | null;
}

interface ResurrectionMilestoneRow {
  id: string;
  mode_id: string;
  target_date: string;
  target_weight: number;
  position: number;
  reached: boolean | null;
  reached_weight: number | null;
}

interface WeightEntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  weight: number;
  created_at: string;
}

function toMode(row: ResurrectionModeRow): ResurrectionMode {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    startWeight: Number(row.start_weight),
    targetWeight: Number(row.target_weight),
    status: row.status,
    createdAt: row.created_at,
    endedAt: row.ended_at,
  };
}

function toMilestone(row: ResurrectionMilestoneRow): ResurrectionMilestone {
  return {
    id: row.id,
    modeId: row.mode_id,
    targetDate: row.target_date,
    targetWeight: Number(row.target_weight),
    position: row.position,
    reached: row.reached,
    reachedWeight: row.reached_weight !== null ? Number(row.reached_weight) : null,
  };
}

function toWeightEntry(row: WeightEntryRow): WeightEntry {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    weight: Number(row.weight),
    createdAt: row.created_at,
  };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/** Lit le mode actif et le fait passer en `termine` si l'échéance est dépassée (pas de cron en V1). */
export async function getActiveMode(): Promise<ResurrectionMode | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('resurrection_modes').select('*').eq('user_id', userId).eq('status', 'actif').maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const mode = toMode(data as ResurrectionModeRow);
  if (mode.endDate < toDateKey(new Date())) {
    const { data: updated, error: updateError } = await supabase
      .from('resurrection_modes')
      .update({ status: 'termine', ended_at: new Date().toISOString() })
      .eq('id', mode.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    return toMode(updated as ResurrectionModeRow);
  }
  return mode;
}

export async function createMode(input: {
  startDate: string;
  endDate: string;
  startWeight: number;
  targetWeight: number;
  milestones: GeneratedMilestone[];
}): Promise<ResurrectionMode> {
  const userId = await currentUserId();
  const { data: modeRow, error: modeError } = await supabase
    .from('resurrection_modes')
    .insert({
      user_id: userId,
      start_date: input.startDate,
      end_date: input.endDate,
      start_weight: input.startWeight,
      target_weight: input.targetWeight,
    })
    .select('*')
    .single();
  if (modeError) throw modeError;
  const mode = toMode(modeRow as ResurrectionModeRow);

  if (input.milestones.length > 0) {
    const payload = input.milestones.map((m) => ({
      mode_id: mode.id,
      target_date: toDateKey(m.targetDate),
      target_weight: m.targetWeight,
      position: m.position,
    }));
    const { error: msError } = await supabase.from('resurrection_milestones').insert(payload);
    if (msError) throw msError;
  }

  return mode;
}

export async function stopMode(modeId: string): Promise<void> {
  const { error } = await supabase.from('resurrection_modes').update({ status: 'arrete', ended_at: new Date().toISOString() }).eq('id', modeId);
  if (error) throw error;
}

export async function listMilestones(modeId: string): Promise<ResurrectionMilestone[]> {
  const { data, error } = await supabase.from('resurrection_milestones').select('*').eq('mode_id', modeId).order('position', { ascending: true });
  if (error) throw error;
  return (data as ResurrectionMilestoneRow[]).map(toMilestone);
}

export async function listWeightEntries(from: string, to: string): Promise<WeightEntry[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', from)
    .lte('entry_date', to)
    .order('entry_date', { ascending: true });
  if (error) throw error;
  return (data as WeightEntryRow[]).map(toWeightEntry);
}

export async function getLatestWeightEntry(): Promise<WeightEntry | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toWeightEntry(data as WeightEntryRow) : null;
}

export async function upsertWeightEntry(entryDate: string, weight: number): Promise<WeightEntry> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('weight_entries')
    .upsert({ user_id: userId, entry_date: entryDate, weight }, { onConflict: 'user_id,entry_date' })
    .select('*')
    .single();
  if (error) throw error;
  return toWeightEntry(data as WeightEntryRow);
}
