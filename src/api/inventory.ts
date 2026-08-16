import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { InventoryItem } from '../domain/types';

interface InventoryItemRow {
  id: string;
  label: string;
  icon: string | null;
  quantity: number;
  unit: string | null;
  min_qty: number;
  updated_by: string | null;
  updated_at: string;
}

function toItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon,
    quantity: row.quantity,
    unit: row.unit,
    minQty: row.min_qty,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function listInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase.from('inventory_items').select('*').order('label', { ascending: true });
  if (error) throw error;
  return (data as InventoryItemRow[]).map(toItem);
}

export async function addInventoryItem(input: { label: string; icon: string | null; unit: string | null; minQty: number }): Promise<InventoryItem> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ label: input.label, icon: input.icon, unit: input.unit, min_qty: input.minQty, quantity: input.minQty, updated_by: userData.user.id })
    .select('*')
    .single();
  if (error) throw error;
  return toItem(data as InventoryItemRow);
}

export async function adjustInventoryQuantity(id: string, currentQuantity: number, delta: number): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const nextQuantity = Math.max(0, currentQuantity + delta);
  const { error } = await supabase
    .from('inventory_items')
    .update({ quantity: nextQuantity, updated_by: userData.user.id, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

type InventoryChangeHandler = (payload: RealtimePostgresChangesPayload<InventoryItemRow>) => void;

export function subscribeToInventory(onChange: InventoryChangeHandler) {
  const channel = supabase
    .channel('inventory-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
