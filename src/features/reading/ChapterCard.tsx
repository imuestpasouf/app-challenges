import { useState } from 'react';
import { chapterState, isHidden, ratingsRevealed } from '../../domain/reading';
import type { ChapterComment, ChapterQuote, ChapterRating } from '../../domain/types';
import { formatShortFr } from '../../lib/date';

const BADGE_LABEL = { both_read: 'LU PAR LES 2', waiting_other: 'EN ATTENTE', not_read_by_me: 'PAS ENCORE LU' } as const;
const BADGE_CLASS = { both_read: 'b-both', waiting_other: 'b-wait', not_read_by_me: 'b-todo' } as const;

function stars(n: number): string {
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

interface Person {
  id: string;
  name: string;
}

interface ChapterCardProps {
  chapter: number;
  me: Person;
  partner: Person | null;
  myPos: number;
  theirPos: number;
  comments: ChapterComment[];
  quotes: ChapterQuote[];
  myRating?: ChapterRating;
  theirRating?: ChapterRating;
  onAddComment: (chapter: number, content: string, sealed: boolean) => void;
  onAddQuote: (chapter: number, content: string, page: number | null, sealed: boolean) => void;
  onSetRating: (chapter: number, rating: number) => void;
}

export function ChapterCard({
  chapter,
  me,
  partner,
  myPos,
  theirPos,
  comments,
  quotes,
  myRating,
  theirRating,
  onAddComment,
  onAddQuote,
  onSetRating,
}: ChapterCardProps) {
  const [commentText, setCommentText] = useState('');
  const [commentSealed, setCommentSealed] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [quoteSealed, setQuoteSealed] = useState(true);

  const iRead = myPos >= chapter;
  const state = chapterState(chapter, myPos, theirPos);
  const revealed = ratingsRevealed(chapter, myPos, theirPos, myRating, theirRating);

  function handleSendComment() {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(chapter, trimmed, commentSealed);
    setCommentText('');
    setCommentSealed(false);
  }

  function handleAddQuote() {
    const trimmed = quoteText.trim();
    if (!trimmed) return;
    const parsedPage = quotePage.trim() ? parseInt(quotePage, 10) : null;
    onAddQuote(chapter, trimmed, Number.isNaN(parsedPage) ? null : parsedPage, quoteSealed);
    setQuoteText('');
    setQuotePage('');
    setQuoteSealed(true);
    setQuoteOpen(false);
  }

  function ratingCell(who: Person, rating: ChapterRating | undefined) {
    const mine = who.id === me.id;
    const grad = mine ? 'linear-gradient(135deg,var(--brand),var(--brand-2))' : 'linear-gradient(135deg,var(--her),var(--her-2))';
    return (
      <div className={`rate${rating && !revealed ? ' hidden' : ''}`}>
        <div className="who">
          <i style={{ background: grad }}>{who.name[0]?.toUpperCase() ?? '?'}</i>
          {who.name}
        </div>
        {rating ? (
          <>
            <div className="stars">{stars(rating.rating)}</div>
            {!revealed && <div className="lockmsg">révélé quand vous aurez tous les deux lu &amp; noté</div>}
          </>
        ) : (
          <>
            <div className="stars" style={{ opacity: 0.35 }}>
              ☆☆☆☆☆
            </div>
            <div className="lockmsg">pas encore noté</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="glass chap">
      <div className="ch">
        <b>Chapitre {chapter}</b>
        <span className={`badge ${BADGE_CLASS[state]}`}>{BADGE_LABEL[state]}</span>
      </div>

      {(myRating || theirRating) && (
        <div className="rates">
          {ratingCell(me, myRating)}
          {partner && ratingCell(partner, theirRating)}
        </div>
      )}

      {iRead && !myRating && (
        <div className="rate-input">
          <span>Noter ce chapitre</span>
          <div className="stars-pick">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => onSetRating(chapter, n)}>
                ★
              </button>
            ))}
          </div>
        </div>
      )}

      {comments.map((c) => {
        const isMine = c.authorId === me.id;
        const hidden = isHidden(c, me.id, myPos);
        const authorName = isMine ? me.name : (partner?.name ?? '…');
        const grad = isMine ? 'linear-gradient(135deg,var(--brand),var(--brand-2))' : 'linear-gradient(135deg,var(--her),var(--her-2))';
        return (
          <div className="cmt" key={c.id}>
            <span className="cav" style={{ background: grad }}>
              {authorName[0]?.toUpperCase() ?? '?'}
            </span>
            <div className={`cbody${hidden ? ' locked' : ''}`}>
              <div className="top">
                <b>{authorName}</b>
                <span>{formatShortFr(new Date(c.createdAt))}</span>
              </div>
              <p>{hidden ? "Contenu scellé jusqu'à ce que tu aies lu ce chapitre." : c.content}</p>
              {hidden && (
                <div className="lockline">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Se débloque quand tu auras lu le chapitre {chapter}
                </div>
              )}
              {c.sealed && isMine && !hidden && partner && (
                <div className="lockline">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Scellé — visible quand {partner.name} aura lu ce chapitre
                </div>
              )}
            </div>
          </div>
        );
      })}

      {quotes.map((q) => {
        const isMine = q.authorId === me.id;
        const hidden = isHidden(q, me.id, myPos);
        const authorName = isMine ? me.name : (partner?.name ?? '…');
        return (
          <div className={`quote${hidden ? ' locked' : ''}`} key={q.id}>
            <p>« {hidden ? 'Citation scellée…' : q.content} »</p>
            <div className="pg">
              {authorName}
              {q.page ? ` · page ${q.page}` : ''}
            </div>
          </div>
        );
      })}

      {iRead && (
        <>
          <div className="addcmt">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ton commentaire…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendComment();
              }}
            />
            <button
              type="button"
              className={`lockbtn${commentSealed ? ' on' : ''}`}
              title="Sceller"
              onClick={() => setCommentSealed((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
            <button type="button" className="sendc" onClick={handleSendComment}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>

          {!quoteOpen ? (
            <button type="button" className="addquote-link" onClick={() => setQuoteOpen(true)}>
              + Ajouter une citation
            </button>
          ) : (
            <div className="field-card" style={{ marginTop: 10 }}>
              <input value={quoteText} onChange={(e) => setQuoteText(e.target.value)} placeholder="Citation" className="plain-input" style={{ width: '100%' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={quotePage}
                  onChange={(e) => setQuotePage(e.target.value)}
                  placeholder="Page (optionnel)"
                  className="plain-input"
                  inputMode="numeric"
                  style={{ flex: 1 }}
                />
                <button type="button" className={`lockbtn${quoteSealed ? ' on' : ''}`} title="Sceller" onClick={() => setQuoteSealed((v) => !v)}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleAddQuote}
                  style={{ flex: 1, borderRadius: 16, padding: '10px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #4C5BD4, #8B5CD6)', border: 'none' }}
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteOpen(false)}
                  style={{ borderRadius: 16, padding: '10px 16px', fontWeight: 600, background: 'rgba(255,255,255,.5)', border: 'none', color: 'var(--text-2)' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
