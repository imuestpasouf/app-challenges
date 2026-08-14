import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateSeparator } from '../../lib/date';
import { useChatData } from './useChatData';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../../domain/types';

const EMOJI_STRIP = ['😊', '❤️', '😂', '🔥', '💪', '😢', '😮', '😍', '👏', '🎉'];

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface DayGroup {
  label: string;
  items: { message: ChatMessage; gap: boolean }[];
}

function groupByDay(messages: ChatMessage[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let lastDateKey = '';
  let lastSenderId = '';

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const dateKey = date.toDateString();
    if (dateKey !== lastDateKey) {
      groups.push({ label: formatDateSeparator(date), items: [] });
      lastDateKey = dateKey;
      lastSenderId = '';
    }
    const gap = message.senderId !== lastSenderId;
    groups[groups.length - 1].items.push({ message, gap });
    lastSenderId = message.senderId;
  }
  return groups;
}

export function ChatScreen() {
  const { myId, partner, partnerOnline, messages, reactions, sendText, sendPhoto, sendingPhoto, react } = useChatData();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupByDay(messages), [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const lastMine = [...messages].reverse().find((m) => m.senderId === myId);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendText(trimmed);
    setText('');
    setEmojiOpen(false);
  }

  function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) sendPhoto(file);
    e.target.value = '';
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-82px)] w-full max-w-sm flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line bg-white/70 px-4 py-3 backdrop-blur">
        <div className="relative flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-partner to-partner-2 font-heading text-lg font-extrabold text-white">
          {partner?.name?.[0]?.toUpperCase() ?? '?'}
          {partnerOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green" />}
        </div>
        <div className="min-w-0 flex-1">
          <b className="block truncate font-heading text-base font-extrabold text-ink">{partner?.name ?? '…'}</b>
          <span className={`text-[11.5px] font-semibold ${partnerOnline ? 'text-green' : 'text-muted-2'}`}>
            {partnerOnline ? '● en ligne' : 'hors ligne'}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="my-3 flex justify-center">
              <span className="rounded-full bg-muted-2/10 px-3 py-1 font-mono text-[10px] text-muted-2">{group.label}</span>
            </div>
            {group.items.map(({ message, gap }) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.senderId === myId}
                gap={gap}
                reactions={reactions.filter((r) => r.messageId === message.id)}
                onReact={(emoji) => react({ messageId: message.id, emoji })}
              />
            ))}
          </div>
        ))}

        {lastMine && (
          <div className="mt-1.5 flex items-center justify-end gap-1 font-mono text-[10px] font-bold text-muted-2">
            {lastMine.readAt ? (
              <span className="text-brand">Vu {formatTime(lastMine.readAt)}</span>
            ) : (
              <span>Envoyé</span>
            )}
          </div>
        )}
      </div>

      {emojiOpen && (
        <div className="flex flex-wrap gap-1 border-t border-line bg-white/85 px-3 py-2">
          {EMOJI_STRIP.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((t) => t + emoji)}
              className="rounded-lg p-1 text-xl hover:bg-line-2"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-shrink-0 items-end gap-2 border-t border-line bg-white/85 px-3 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sendingPhoto}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted disabled:opacity-50"
          title="Photo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L6 18" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickPhoto} />

        <div className="flex min-h-10 flex-1 items-center rounded-[22px] border border-line bg-card pl-3.5 pr-1.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Écris un message…"
            className="flex-1 border-0 bg-transparent py-2 text-sm text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-lg"
          >
            😊
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={text.trim().length === 0}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-white shadow-card transition-transform disabled:scale-0 disabled:opacity-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
