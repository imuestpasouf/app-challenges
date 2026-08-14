import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { getPartnerProfile } from '../../api/profile';
import {
  listMessages,
  listReactions,
  markRead,
  notifyNewMessage,
  sendMessage,
  setReaction,
  subscribeToChat,
  uploadPhoto,
} from '../../api/chat';
import { useAuth } from '../../app/useAuth';

export function useChatData() {
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const partnerQuery = useQuery({ queryKey: ['chat-partner'], queryFn: getPartnerProfile });
  const messagesQuery = useQuery({ queryKey: ['chat-messages'], queryFn: listMessages });
  const reactionsQuery = useQuery({ queryKey: ['chat-reactions'], queryFn: listReactions });

  useEffect(() => {
    return subscribeToChat(
      () => queryClient.invalidateQueries({ queryKey: ['chat-messages'] }),
      () => queryClient.invalidateQueries({ queryKey: ['chat-reactions'] })
    );
  }, [queryClient]);

  const [partnerOnline, setPartnerOnline] = useState(false);
  useEffect(() => {
    if (!myId) return;
    const channel = supabase.channel('chat-presence', { config: { presence: { key: myId } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setPartnerOnline(Object.keys(state).some((key) => key !== myId));
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ online_at: new Date().toISOString() });
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId]);

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  useEffect(() => {
    if (!myId) return;
    if (messages.some((m) => m.senderId !== myId && m.readAt === null)) {
      void markRead().then(() => queryClient.invalidateQueries({ queryKey: ['chat-messages'] }));
    }
  }, [messages, myId, queryClient]);

  const partner = partnerQuery.data ?? null;

  const sendTextMutation = useMutation({
    mutationFn: (content: string) => sendMessage({ content, imagePath: null }),
    onSuccess: (_message, content) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      if (partner) void notifyNewMessage(partner.id, content);
    },
  });

  const sendPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadPhoto(file);
      return sendMessage({ content: null, imagePath: path });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      if (partner) void notifyNewMessage(partner.id, '📷 Photo');
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => setReaction(messageId, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-reactions'] }),
  });

  return {
    myId,
    partner,
    partnerOnline,
    messages,
    reactions: reactionsQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendText: sendTextMutation.mutate,
    sendPhoto: sendPhotoMutation.mutate,
    sendingPhoto: sendPhotoMutation.isPending,
    react: reactMutation.mutate,
  };
}
