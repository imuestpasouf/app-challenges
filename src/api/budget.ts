import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { MonthlyBudget } from '../domain/types';

interface BudgetRow {
  id: string;
  year_month: string;
  amount: number;
  updated_by: string | null;
  updated_at: string;
}

function toBudget(row: BudgetRow): MonthlyBudget {
  return {
    id: row.id,
    yearMonth: row.year_month,
    amount: row.amount,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function getBudget(yearMonth: string): Promise<MonthlyBudget | null> {
  const { data, error } = await supabase.from('monthly_budgets').select('*').eq('year_month', yearMonth).maybeSingle();
  if (error) throw error;
  return data ? toBudget(data as BudgetRow) : null;
}

export async function setBudget(yearMonth: string, amount: number): Promise<MonthlyBudget> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('monthly_budgets')
    .upsert({ year_month: yearMonth, amount, updated_by: userData.user.id, updated_at: new Date().toISOString() }, { onConflict: 'year_month' })
    .select('*')
    .single();
  if (error) throw error;
  return toBudget(data as BudgetRow);
}

type BudgetChangeHandler = (payload: RealtimePostgresChangesPayload<BudgetRow>) => void;

export function subscribeToBudget(onChange: BudgetChangeHandler) {
  const channel = supabase
    .channel('budget-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_budgets' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
