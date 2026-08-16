import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Expense } from '../domain/types';

interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  paid_by: string | null;
  note: string | null;
  expense_date: string;
  created_at: string;
  label: string | null;
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    paidBy: row.paid_by,
    note: row.note,
    expenseDate: row.expense_date,
    createdAt: row.created_at,
    label: row.label,
  };
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (error) throw error;
  return (data as ExpenseRow[]).map(toExpense);
}

export async function addExpense(input: { amount: number; category: string; label: string | null; expenseDate: string }): Promise<Expense> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('expenses')
    .insert({ amount: input.amount, category: input.category, label: input.label, expense_date: input.expenseDate, paid_by: userData.user.id })
    .select('*')
    .single();
  if (error) throw error;
  return toExpense(data as ExpenseRow);
}

type ExpensesChangeHandler = (payload: RealtimePostgresChangesPayload<ExpenseRow>) => void;

export function subscribeToExpenses(onChange: ExpensesChangeHandler) {
  const channel = supabase
    .channel('expenses-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
