import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listChallenges } from '../../api/challenges';
import { useAuth } from '../../app/useAuth';
import { formatEyebrowDate, formatShortFr } from '../../lib/date';
import { categoryStyle } from '../../lib/category';
import { CategoryIconGlyph } from '../../components/CategoryIcon';
import { useChallengeCards } from './useChallengeCards';
import { useShoppingSummary } from '../shopping/useShoppingSummary';
import { useReadingSummary } from '../reading/useReadingSummary';

const RING_CIRCUMFERENCE = 239;

function fmtSigned(n: number) {
  return (n > 0 ? '+' : '') + n;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  const { subtitle: shoppingSubtitle } = useShoppingSummary();
  const { subtitle: readingSubtitle } = useReadingSummary();

  const challengesQuery = useQuery({ queryKey: ['challenges'], queryFn: listChallenges });
  const challenges = challengesQuery.data ?? [];
  const activeChallenges = challenges.filter((c) => c.status === 'actif');

  const cardResults = useChallengeCards(activeChallenges);
  const cards = cardResults.map((r) => r.data).filter((d) => !!d);

  const doneToday = cards.filter((c) => c.todayDone).length;
  const totalActive = activeChallenges.length;
  const ringOffset = totalActive > 0 ? RING_CIRCUMFERENCE * (1 - doneToday / totalActive) : RING_CIRCUMFERENCE;

  const sportCard = cards.find((c) => c.challenge.category === 'sport');
  const showSportAlert = !!sportCard && !sportCard.todayDone;

  const latestEndDate = activeChallenges.length
    ? activeChallenges.reduce((latest, c) => (c.endDate > latest ? c.endDate : latest), activeChallenges[0].endDate)
    : null;

  return (
    <section className="page-enter screen">
      <div className="ltitle">
        <div className="k">{formatEyebrowDate(new Date())}</div>
        <h1>Une autre journée pour dead ça</h1>
      </div>

      {showSportAlert && (
        <button type="button" className="glass alert" onClick={() => navigate('/sport')}>
          <div className="d">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div className="t">
            <strong>Saisie du jour manquante</strong>
            <span>Tu n'as pas rentré tes calories aujourd'hui</span>
          </div>
          <div className="go">›</div>
        </button>
      )}

      {totalActive > 0 && (
        <div className="glass counter">
          <div className="progress-ring">
            <svg width="90" height="90" viewBox="0 0 90 90">
              <g transform="rotate(-90 45 45)">
                <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(20,40,52,.14)" strokeWidth="8" />
                <circle
                  className="p"
                  cx="45"
                  cy="45"
                  r="38"
                  fill="none"
                  stroke="#4C5BD4"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDashoffset={mounted ? ringOffset : RING_CIRCUMFERENCE}
                />
              </g>
            </svg>
            <div className="v">
              <b>
                {doneToday}
                <small style={{ fontSize: 15 }}>/{totalActive}</small>
              </b>
              <small>aujourd'hui</small>
            </div>
          </div>
          <div className="m">
            <h3>Objectifs du jour</h3>
            <p>
              {doneToday} validé{doneToday > 1 ? 's' : ''} sur {totalActive}. Encore un peu de motivation aujourd'hui 💪
            </p>
          </div>
        </div>
      )}

      <button type="button" className="glass ctacard" onClick={() => navigate('/shopping')} style={{ width: '100%', textAlign: 'left', border: 'none' }}>
        <div className="ctaico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <div className="ctatxt">
          <b>Courses &amp; maison</b>
          <span>{shoppingSubtitle}</span>
        </div>
        <div className="ctago">›</div>
      </button>

      <button
        type="button"
        className="glass ctacard book"
        onClick={() => navigate('/reading')}
        style={{ width: '100%', textAlign: 'left', border: 'none' }}
      >
        <div className="ctaico book">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div className="ctatxt">
          <b>Lecture à deux</b>
          <span>{readingSubtitle}</span>
        </div>
        <div className="ctago">›</div>
      </button>

      <div className="grouptitle">
        <span>MES CHALLENGES</span>
        <span>
          {totalActive} actif{totalActive > 1 ? 's' : ''}
          {latestEndDate ? ` · fin ${formatShortFr(new Date(latestEndDate))}` : ''}
        </span>
      </div>

      {!challengesQuery.isLoading && challenges.length === 0 && <p className="note">Aucun challenge pour l'instant.</p>}

      {activeChallenges.length > 0 && (
        <div className="glass glist">
          {activeChallenges.map((challenge) => {
            const card = cards.find((c) => c.challenge.id === challenge.id);
            const style = categoryStyle(challenge.category);
            const isSport = challenge.category === 'sport';
            const iconClass = style.icon === 'book' ? 'ic-r' : style.icon === 'language' ? 'ic-l' : 'ic-s';
            const barClass = style.icon === 'book' ? 'bar-r' : style.icon === 'language' ? 'bar-l' : 'bar-s';
            const pctClass = style.icon === 'book' ? 'pct-r' : style.icon === 'language' ? 'pct-l' : 'pct-s';

            const badge =
              isSport && card?.sportBalance !== null && card?.sportZone
                ? `${fmtSigned(card.sportBalance!)} kcal`
                : card
                  ? `${card.adherencePct}%`
                  : '…';

            const sub = !card
              ? 'Chargement…'
              : isSport
                ? card.sportZone
                  ? card.sportZone.label
                  : 'Pas encore de saisie aujourd’hui'
                : `${card.daysWithEntry}/${card.daysElapsed} jours renseignés`;

            const barPct = isSport ? (card?.todayDone ? 100 : 0) : (card?.adherencePct ?? 0);

            return (
              <button
                key={challenge.id}
                type="button"
                className={`obj ${isSport ? '' : 'disabled'}`}
                onClick={() => (isSport ? navigate('/sport') : undefined)}
                disabled={!isSport}
              >
                <div className={`ic ${iconClass}`}>
                  <CategoryIconGlyph icon={style.icon} />
                </div>
                <div className="b">
                  <div className="top">
                    <h4>{challenge.title}</h4>
                    <span className={`pct ${isSport && card?.sportZone ? '' : pctClass}`} style={isSport && card?.sportZone ? { color: `var(--${card.sportZone.zone})` } : undefined}>
                      {badge}
                    </span>
                  </div>
                  <div className="bar">
                    <i className={barClass} style={{ width: `${mounted ? barPct : 0}%` }} />
                  </div>
                  <div className="sub">
                    {sub}
                    {!isSport && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(40,42,60,.1)' }}>
                        écran à venir
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button type="button" className="dashed-row" onClick={() => navigate('/challenges/new')}>
        + Nouveau challenge
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <Link to="/settings" className="note" style={{ textDecoration: 'underline' }}>
          Réglages
        </Link>
        <button type="button" onClick={() => void signOut()} className="note" style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </div>

      <p className="note" style={{ marginTop: 8 }}>
        v{__APP_VERSION__} ·{' '}
        {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </section>
  );
}
