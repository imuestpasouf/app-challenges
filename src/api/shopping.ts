import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ShoppingItem } from '../domain/types';

interface ShoppingItemRow {
  id: string;
  label: string;
  checked: boolean;
  added_by: string | null;
  created_at: string;
  qty: string | null;
  checked_at: string | null;
  checked_by: string | null;
}

function toItem(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    label: row.label,
    checked: row.checked,
    addedBy: row.added_by,
    createdAt: row.created_at,
    qty: row.qty,
    checkedAt: row.checked_at,
    checkedBy: row.checked_by,
  };
}

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase.from('shopping_items').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ShoppingItemRow[]).map(toItem);
}

export async function addShoppingItem(label: string, qty: string | null = null): Promise<ShoppingItem> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({ label, qty, added_by: userData.user.id })
    .select('*')
    .single();
  if (error) throw error;
  return toItem(data as ShoppingItemRow);
}

export async function toggleShoppingItem(id: string, checked: boolean): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('shopping_items')
    .update({ checked, checked_at: checked ? new Date().toISOString() : null, checked_by: checked ? userData.user.id : null })
    .eq('id', id);
  if (error) throw error;
}

export async function clearCheckedItems(): Promise<void> {
  const { error } = await supabase.from('shopping_items').delete().eq('checked', true);
  if (error) throw error;
}

type ShoppingChangeHandler = (payload: RealtimePostgresChangesPayload<ShoppingItemRow>) => void;

export function subscribeToShopping(onChange: ShoppingChangeHandler) {
  const channel = supabase
    .channel('shopping-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
