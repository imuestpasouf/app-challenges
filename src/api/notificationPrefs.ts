import { supabase } from './supabase';

export interface NotificationPrefs {
  userId: string;
  chat: boolean;
  sharedUpdates: boolean;
  milestones: boolean;
  dailyReminder: boolean;
  reminderTime: string;
}

interface NotificationPrefsRow {
  user_id: string;
  chat: boolean;
  shared_updates: boolean;
  milestones: boolean;
  daily_reminder: boolean;
  reminder_time: string;
}

function toPrefs(row: NotificationPrefsRow): NotificationPrefs {
  return {
    userId: row.user_id,
    chat: row.chat,
    sharedUpdates: row.shared_updates,
    milestones: row.milestones,
    dailyReminder: row.daily_reminder,
    reminderTime: row.reminder_time.slice(0, 5),
  };
}

export async function getOrCreateMyPrefs(): Promise<NotificationPrefs> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return toPrefs(data as NotificationPrefsRow);

  const { data: created, error: insertError } = await supabase
    .from('notification_prefs')
    .insert({ user_id: userData.user.id })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return toPrefs(created as NotificationPrefsRow);
}

export async function updateMyPrefs(patch: Partial<Omit<NotificationPrefs, 'userId'>>): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not authenticated');

  const payload: Partial<NotificationPrefsRow> = {};
  if (patch.chat !== undefined) payload.chat = patch.chat;
  if (patch.sharedUpdates !== undefined) payload.shared_updates = patch.sharedUpdates;
  if (patch.milestones !== undefined) payload.milestones = patch.milestones;
  if (patch.dailyReminder !== undefined) payload.daily_reminder = patch.dailyReminder;
  if (patch.reminderTime !== undefined) payload.reminder_time = patch.reminderTime;

  const { error } = await supabase.from('notification_prefs').update(payload).eq('user_id', userData.user.id);
  if (error) throw error;
}
