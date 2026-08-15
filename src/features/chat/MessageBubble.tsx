import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPhotoSignedUrl } from '../../api/chat';
import type { ChatMessage, MessageReaction } from '../../domain/types';

const REACTS = ['😊', '❤️', '😂', '🔥', '💪', '😢'];

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
    <div className={`row ${isMine ? 'sent' : 'recv'} ${gap ? 'gap' : ''}`}>
      <div className={`bubble${message.imagePath ? ' photo' : ''}`} onClick={() => setPickerOpen((v) => !v)}>
        {message.imagePath ? (
          photoQuery.data ? (
            <img src={photoQuery.data} alt="" />
          ) : (
            <div className="ph" style={{ fontSize: 24 }}>
              …
            </div>
          )
        ) : (
          <span className="tx">{message.content}</span>
        )}
        {message.content && message.imagePath && <div className="cap">{message.content}</div>}

        {groupedReactions.length > 0 && (
          <div className="reactions">
            {groupedReactions.map(([emoji, count]) => (
              <span key={emoji} className="rc">
                {emoji}
                {count > 1 && <small style={{ fontSize: 9, fontWeight: 700, marginLeft: 2 }}>{count}</small>}
              </span>
            ))}
          </div>
        )}

        {pickerOpen && (
          <div className="rpicker" onClick={(e) => e.stopPropagation()}>
            {REACTS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setPickerOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
