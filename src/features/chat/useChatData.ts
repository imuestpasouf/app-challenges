import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { getMyProfileName, getPartnerProfile } from '../../api/profile';
import {
  listMessages,
  listReactions,
  markRead,
  notifyNewMessage,
  sendMessage,
  setReaction,
  subscribeToChat,
  subscribeToTyping,
  uploadPhoto,
} from '../../api/chat';
import { useAuth } from '../../app/useAuth';

export function useChatData() {
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const partnerQuery = useQuery({ queryKey: ['chat-partner'], queryFn: getPartnerProfile });
  const myProfileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfileName });
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

  const [partnerTyping, setPartnerTyping] = useState(false);
  const notifyTypingRef = useRef<() => void>(() => {});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!myId) return;
    const { notifyTyping, unsubscribe } = subscribeToTyping(() => {
      setPartnerTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 2500);
    });
    notifyTypingRef.current = notifyTyping;
    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [myId]);

  const lastTypingSentRef = useRef(0);
  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    notifyTypingRef.current();
  }

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  useEffect(() => {
    setPartnerTyping((wasTyping) => {
      if (!wasTyping) return wasTyping;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return false;
    });
  }, [messages.length]);

  useEffect(() => {
    if (!myId) return;
    if (messages.some((m) => m.senderId !== myId && m.readAt === null)) {
      void markRead().then(() => queryClient.invalidateQueries({ queryKey: ['chat-messages'] }));
    }
  }, [messages, myId, queryClient]);

  const partner = partnerQuery.data ?? null;
  const myName = myProfileQuery.data ?? 'Nouveau message';

  const sendTextMutation = useMutation({
    mutationFn: (content: string) => sendMessage({ content, imagePath: null }),
    onSuccess: (_message, content) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      if (partner) void notifyNewMessage(partner.id, myName, content);
    },
  });

  const sendPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadPhoto(file);
      return sendMessage({ content: null, imagePath: path });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      if (partner) void notifyNewMessage(partner.id, myName, '📷 Photo');
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
    partnerTyping,
    notifyTyping,
    messages,
    reactions: reactionsQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendText: sendTextMutation.mutate,
    sendPhoto: sendPhotoMutation.mutate,
    sendingPhoto: sendPhotoMutation.isPending,
    react: reactMutation.mutate,
  };
}
