import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPhotoSignedUrl } from '../../api/chat';
import type { ChatMessage, MessageReaction } from '../../domain/types';

const REACTS = ['😊', '❤️', '😂', '🔥', '💪', '😢'];

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  gap: boolean;
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
}

export function MessageBubble({ message, isMine, gap, reactions, onReact }: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const photoQuery = useQuery({
    queryKey: ['chat-photo-url', message.imagePath],
    queryFn: () => getPhotoSignedUrl(message.imagePath!),
    enabled: !!message.imagePath,
    staleTime: 50 * 60 * 1000,
  });

  const groupedReactions = Object.entries(
    reactions.reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${gap ? 'mt-3' : 'mt-0.5'}`}>
      <div
        onClick={() => setPickerOpen((v) => !v)}
        className={`relative max-w-[76%] cursor-pointer shadow-sm ${
          message.imagePath ? 'overflow-hidden p-[5px]' : 'px-3.5 py-2.5'
        } text-sm leading-relaxed ${
          isMine
            ? 'rounded-[20px_20px_7px_20px] bg-gradient-to-br from-brand to-brand-2 text-white'
            : 'rounded-[20px_20px_20px_7px] border border-line bg-card text-ink'
        } ${groupedReactions.length > 0 ? 'mb-3' : ''}`}
      >
        {message.imagePath ? (
          photoQuery.data ? (
            <img src={photoQuery.data} alt="" className="block h-[150px] w-[210px] rounded-2xl object-cover" />
          ) : (
            <div className="flex h-[150px] w-[210px] items-center justify-center rounded-2xl bg-line-2 text-xs text-muted">
              Chargement…
            </div>
          )
        ) : (
          message.content
        )}
        {message.content && message.imagePath && <div className="px-2 pb-0.5 pt-1.5 text-[13px]">{message.content}</div>}

        {groupedReactions.length > 0 && (
          <div className={`absolute -bottom-3 flex gap-1 ${isMine ? 'right-2.5' : 'left-2.5'}`}>
            {groupedReactions.map(([emoji, count]) => (
              <span
                key={emoji}
                className="flex items-center gap-0.5 rounded-full border border-line bg-white px-1.5 py-0.5 text-xs shadow-sm"
              >
                {emoji}
                {count > 1 && <small className="font-mono text-[9px] font-bold text-muted">{count}</small>}
              </span>
            ))}
          </div>
        )}

        {pickerOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute -top-12 z-50 flex gap-0.5 rounded-full border border-line bg-white px-1.5 py-1 shadow-card ${
              isMine ? 'right-0' : 'left-0'
            }`}
          >
            {REACTS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setPickerOpen(false);
                }}
                className="rounded-full p-1 text-xl transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="mt-0.5 px-1.5 font-mono text-[9.5px] text-muted-2">{formatTime(message.createdAt)}</span>
    </div>
  );
}
