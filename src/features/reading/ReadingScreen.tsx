import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReadingData } from './useReadingData';
import { ChapterCard } from './ChapterCard';
import { countUnlocked, nextPosition, turnState, validateRange } from '../../domain/reading';

export function ReadingScreen() {
  const navigate = useNavigate();
  const {
    myId,
    myName,
    partner,
    book,
    createBook,
    finishBook,
    myPos,
    theirPos,
    comments,
    quotes,
    ratings,
    advance,
    addComment,
    addQuote,
    setRating,
    isLoading,
  } = useReadingData();

  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newEmoji, setNewEmoji] = useState('📖');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [rFrom, setRFrom] = useState(1);
  const [rTo, setRTo] = useState(1);

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function handleCreateBook() {
    const title = newTitle.trim();
    const total = parseInt(newTotal, 10);
    if (!title || Number.isNaN(total) || total <= 0) return;
    createBook({ title, author: newAuthor.trim() || null, coverEmoji: newEmoji.trim() || '📖', totalChapters: total });
    setNewTitle('');
    setNewAuthor('');
    setNewTotal('');
    setNewEmoji('📖');
  }

  function openSheet() {
    const from = myPos + 1;
    setRFrom(from);
    setRTo(from);
    setSheetOpen(true);
  }

  function adjust(which: 'from' | 'to', delta: number, total: number) {
    if (which === 'from') {
      const next = Math.max(1, Math.min(total, rFrom + delta));
      setRFrom(next);
      if (rTo < next) setRTo(next);
    } else {
      setRTo(Math.max(rFrom, Math.min(total, rTo + delta)));
    }
  }

  async function confirmRange() {
    if (!book || !validateRange(rFrom, rTo, book.totalChapters)) return;
    const before = myPos;
    const after = nextPosition(before, rTo);
    await advance(rFrom, rTo);
    setSheetOpen(false);
    const allItems = [...comments, ...quotes];
    const unlocked = myId ? countUnlocked(allItems, myId, before, after) : 0;
    showToast(unlocked > 0 ? `${unlocked} contenu${unlocked > 1 ? 's' : ''} débloqué${unlocked > 1 ? 's' : ''} 🔓` : `Lecture enregistrée — chapitre ${after}`);
  }

  if (isLoading) {
    return (
      <section className="push-enter screen">
        <div className="navback">
          <button type="button" className="backbtn" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span>Accueil</span>
        </div>
        <p className="note" style={{ marginTop: 20 }}>
          Chargement…
        </p>
      </section>
    );
  }

  if (!book) {
    return (
      <section className="push-enter screen">
        <div className="navback">
          <button type="button" className="backbtn" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span>Accueil</span>
        </div>
        <div className="ltitle" style={{ paddingTop: 4 }}>
          <div className="k">Lecture à deux</div>
          <h1>Choisissez votre livre</h1>
        </div>
        <div className="field-card">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre du livre" className="plain-input" style={{ width: '100%' }} />
          <input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Auteur (optionnel)" className="plain-input" style={{ width: '100%', marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={newTotal}
              onChange={(e) => setNewTotal(e.target.value)}
              placeholder="Nombre de chapitres"
              inputMode="numeric"
              className="plain-input"
              style={{ flex: 1 }}
            />
            <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="📖" className="plain-input" style={{ width: 60, textAlign: 'center' }} />
          </div>
          <button
            type="button"
            onClick={handleCreateBook}
            style={{ marginTop: 10, width: '100%', borderRadius: 16, padding: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #4C5BD4, #8B5CD6)', border: 'none' }}
          >
            Commencer ce livre
          </button>
        </div>
      </section>
    );
  }

  const maxCh = Math.max(myPos, theirPos);
  const gap = Math.abs(myPos - theirPos);
  const turn = turnState(myPos, theirPos);
  const me = { id: myId ?? '', name: myName ?? 'Moi' };

  return (
    <section className="push-enter screen">
      <div className="navback">
        <button type="button" className="backbtn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span>Accueil</span>
      </div>
      <div className="ltitle" style={{ paddingTop: 4 }}>
        <div className="k">Lecture à deux</div>
        <h1>Notre livre en cours</h1>
      </div>

      <div className="glass book">
        <div className="cover">{book.coverEmoji}</div>
        <div className="bmeta">
          <div className="t">{book.title}</div>
          {book.author && <div className="a">{book.author}</div>}
          <div className="c">{book.totalChapters} chapitres</div>
        </div>
      </div>

      <div className="glass prog">
        <div className="hd">
          <span>OÙ ON EN EST</span>
          <span>{gap === 0 ? 'À égalité' : `${gap} chapitre${gap > 1 ? 's' : ''} d'écart`}</span>
        </div>
        <div className="prow">
          <span className="pav" style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand-2))' }}>
            {me.name[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="ptrack">
            <i style={{ width: `${(myPos / book.totalChapters) * 100}%`, background: 'var(--brand)' }} />
          </span>
          <span className="pnum">ch. {myPos}</span>
        </div>
        {partner && (
          <div className="prow">
            <span className="pav" style={{ background: 'linear-gradient(135deg,var(--her),var(--her-2))' }}>
              {partner.name[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="ptrack">
              <i style={{ width: `${(theirPos / book.totalChapters) * 100}%`, background: 'var(--her)' }} />
            </span>
            <span className="pnum">ch. {theirPos}</span>
          </div>
        )}
      </div>

      <div className={`glass turn ${turn === 'their_turn' ? 'hers' : 'mine'}`}>
        {turn === 'my_turn' && (
          <>
            <span className="em">🎉</span>
            <div className="t">
              <b>C'est à toi</b>
              <span>
                {partner?.name ?? 'L\'autre'} a fini le chapitre {theirPos} — {gap} chapitre{gap > 1 ? 's' : ''} à rattraper
              </span>
            </div>
          </>
        )}
        {turn === 'their_turn' && (
          <>
            <span className="em">⏳</span>
            <div className="t">
              <b>Au tour de {partner?.name ?? "l'autre"}</b>
              <span>
                Iel en est au chapitre {theirPos}, tu as {gap} chapitre{gap > 1 ? 's' : ''} d'avance
              </span>
            </div>
          </>
        )}
        {turn === 'tied' && (
          <>
            <span className="em">🤝</span>
            <div className="t">
              <b>Vous êtes au même point</b>
              <span>Chapitre {myPos} tous les deux — à qui le tour ?</span>
            </div>
          </>
        )}
      </div>

      <button type="button" className="cta" onClick={openSheet}>
        J'ai avancé dans ma lecture
      </button>

      <div className="lbl">
        <span>CHAPITRES</span>
        <span>
          {maxCh} / {book.totalChapters} entamés
        </span>
      </div>

      {maxCh === 0 && <div className="empty">Aucun chapitre commencé pour l'instant</div>}

      {Array.from({ length: maxCh }, (_, i) => maxCh - i).map((chapter) => (
        <ChapterCard
          key={chapter}
          chapter={chapter}
          me={me}
          partner={partner}
          myPos={myPos}
          theirPos={theirPos}
          comments={comments.filter((c) => c.chapter === chapter)}
          quotes={quotes.filter((q) => q.chapter === chapter)}
          myRating={ratings.find((r) => r.chapter === chapter && r.userId === myId)}
          theirRating={partner ? ratings.find((r) => r.chapter === chapter && r.userId === partner.id) : undefined}
          onAddComment={addComment}
          onAddQuote={addQuote}
          onSetRating={setRating}
        />
      ))}

      <button
        type="button"
        className="note"
        style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}
        onClick={() => finishBook(book.id)}
      >
        Marquer ce livre comme terminé
      </button>

      {toast && <div className="toast on">{toast}</div>}

      {sheetOpen && <div className="scrim on" onClick={() => setSheetOpen(false)} />}
      <div className={`sheet${sheetOpen ? ' open' : ''}`}>
        <div className="grab" />
        <h4>Tu as lu jusqu'où ?</h4>
        <div className="sub">Indique la plage de chapitres que tu viens de lire</div>
        <div className="range">
          <div className="rbox">
            <div className="l">DU CHAPITRE</div>
            <div className="ctl">
              <button type="button" onClick={() => adjust('from', -1, book.totalChapters)}>
                −
              </button>
              <span className="n">{rFrom}</span>
              <button type="button" onClick={() => adjust('from', 1, book.totalChapters)}>
                +
              </button>
            </div>
          </div>
          <span className="to">au</span>
          <div className="rbox">
            <div className="l">CHAPITRE</div>
            <div className="ctl">
              <button type="button" onClick={() => adjust('to', -1, book.totalChapters)}>
                −
              </button>
              <span className="n">{rTo}</span>
              <button type="button" onClick={() => adjust('to', 1, book.totalChapters)}>
                +
              </button>
            </div>
          </div>
        </div>
        <button type="button" className="confirm" onClick={() => void confirmRange()}>
          Valider ma lecture
        </button>
        <button type="button" className="cancel" onClick={() => setSheetOpen(false)}>
          Annuler
        </button>
      </div>
    </section>
  );
}
