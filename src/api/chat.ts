import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ChatMessage, MessageReaction } from '../domain/types';

interface ChatMessageRow {
  id: string;
  sender_id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
  read_at: string | null;
}

interface MessageReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

function toMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    content: row.content,
    imagePath: row.image_path,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function toReaction(row: MessageReactionRow): MessageReaction {
  return {
    id: row.id,
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function listMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ChatMessageRow[]).map(toMessage);
}

export async function listReactions(): Promise<MessageReaction[]> {
  const { data, error } = await supabase.from('message_reactions').select('*');
  if (error) throw error;
  return (data as MessageReactionRow[]).map(toReaction);
}

export async function sendMessage(input: { content: string | null; imagePath: string | null }): Promise<ChatMessage> {
  const senderId = await currentUserId();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ sender_id: senderId, content: input.content, image_path: input.imagePath })
    .select('*')
    .single();
  if (error) throw error;
  return toMessage(data as ChatMessageRow);
}

export async function markRead(): Promise<void> {
  const myId = await currentUserId();
  const { error } = await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .neq('sender_id', myId)
    .is('read_at', null);
  if (error) throw error;
}

export async function setReaction(messageId: string, emoji: string): Promise<void> {
  const myId = await currentUserId();
  const { data: existing, error: fetchError } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('user_id', myId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (existing && (existing as MessageReactionRow).emoji === emoji) {
    const { error } = await supabase.from('message_reactions').delete().eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: myId, emoji }, { onConflict: 'message_id,user_id' });
  if (error) throw error;
}

export async function uploadPhoto(file: File): Promise<string> {
  const senderId = await currentUserId();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${senderId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('chat-photos').upload(path, file);
  if (error) throw error;
  return path;
}

export async function getPhotoSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('chat-photos').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

type MessagesChangeHandler = (payload: RealtimePostgresChangesPayload<ChatMessageRow>) => void;
type ReactionsChangeHandler = (payload: RealtimePostgresChangesPayload<MessageReactionRow>) => void;

export function subscribeToChat(onMessagesChange: MessagesChangeHandler, onReactionsChange: ReactionsChangeHandler) {
  const channel = supabase
    .channel('chat-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, onMessagesChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, onReactionsChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
