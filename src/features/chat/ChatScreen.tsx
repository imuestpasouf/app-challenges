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
    <div className="page-enter" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="chead">
        <div className="av">
          {partner?.name?.[0]?.toUpperCase() ?? '?'}
          {partnerOnline && <span className="on" />}
        </div>
        <div className="who">
          <b>{partner?.name ?? '…'}</b>
          <span style={{ color: partnerOnline ? undefined : 'var(--text-3)' }}>{partnerOnline ? '● en ligne' : 'hors ligne'}</span>
        </div>
        <div className="act">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
      </div>

      <div ref={scrollRef} className="scroll">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="datesep">{group.label}</div>
            {group.items.map(({ message, gap }) => (
              <div key={message.id}>
                <MessageBubble
                  message={message}
                  isMine={message.senderId === myId}
                  gap={gap}
                  reactions={reactions.filter((r) => r.messageId === message.id)}
                  onReact={(emoji) => react({ messageId: message.id, emoji })}
                />
                <div className={`meta ${message.senderId === myId ? 's' : 'r'}`}>{formatTime(message.createdAt)}</div>
              </div>
            ))}
          </div>
        ))}

        {lastMine && (
          <div className="receipt" style={{ color: lastMine.readAt ? 'var(--brand)' : 'var(--text-3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 7 17l-5-5" />
              {lastMine.readAt && <path d="m22 10-7.5 7.5L13 16" />}
            </svg>
            {lastMine.readAt ? `Vu ${formatTime(lastMine.readAt)}` : 'Envoyé'}
          </div>
        )}
      </div>

      {emojiOpen && (
        <div className="estrip open">
          {EMOJI_STRIP.map((emoji) => (
            <button key={emoji} type="button" onClick={() => setText((t) => t + emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <button type="button" className="cbtn" onClick={() => fileInputRef.current?.click()} disabled={sendingPhoto} title="Photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L6 18" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickPhoto} />

        <div className="field">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Écris un message…"
          />
          <button type="button" className="em" onClick={() => setEmojiOpen((v) => !v)}>
            😊
          </button>
        </div>

        <button type="button" className={`send${text.trim().length > 0 ? ' show' : ''}`} onClick={handleSend}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
