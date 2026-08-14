import { supabase } from './supabase';
import type { Challenge, ChallengeField, ChallengeStatus, FieldType } from '../domain/types';

interface ChallengeRow {
  id: string;
  owner_id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  created_at: string;
}

interface ChallengeFieldRow {
  id: string;
  challenge_id: string;
  label: string;
  field_type: FieldType;
  unit: string | null;
  is_required: boolean;
  display_order: number;
}

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toField(row: ChallengeFieldRow): ChallengeField {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    label: row.label,
    fieldType: row.field_type,
    unit: row.unit,
    isRequired: row.is_required,
    displayOrder: row.display_order,
  };
}

export async function listChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ChallengeRow[]).map(toChallenge);
}

export async function getChallengeByCategory(category: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('category', category)
    .eq('status', 'actif')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toChallenge(data as ChallengeRow) : null;
}

export interface NewChallengeField {
  label: string;
  fieldType: FieldType;
  unit: string | null;
  isRequired: boolean;
  displayOrder: number;
}

export async function createChallenge(input: {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  fields: NewChallengeField[];
}): Promise<Challenge> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data: challengeRow, error: challengeError } = await supabase
    .from('challenges')
    .insert({
      owner_id: userData.user.id,
      title: input.title,
      category: input.category,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select('*')
    .single();
  if (challengeError) throw challengeError;

  const fieldsPayload = input.fields.map((f) => ({
    challenge_id: challengeRow.id,
    label: f.label,
    field_type: f.fieldType,
    unit: f.unit,
    is_required: f.isRequired,
    display_order: f.displayOrder,
  }));
  const { error: fieldsError } = await supabase.from('challenge_fields').insert(fieldsPayload);
  if (fieldsError) throw fieldsError;

  return toChallenge(challengeRow as ChallengeRow);
}

export async function listFields(challengeId: string): Promise<ChallengeField[]> {
  const { data, error } = await supabase
    .from('challenge_fields')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data as ChallengeFieldRow[]).map(toField);
}
