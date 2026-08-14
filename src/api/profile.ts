import { supabase } from './supabase';

export async function getMyProfileName(): Promise<string | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase.from('profiles').select('name').eq('id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}

export async function getPartnerProfile(): Promise<{ id: string; name: string } | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .neq('id', userData.user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
