import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listChallenges } from '../../api/challenges';
import { useAuth } from '../../app/useAuth';
import { formatEyebrowDate, formatShortFr } from '../../lib/date';
import { categoryStyle } from '../../lib/category';
import { CategoryIconGlyph } from '../../components/CategoryIcon';
import { useChallengeCards } from './useChallengeCards';

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

function fmtSigned(n: number) {
  return (n > 0 ? '+' : '') + n;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

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
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <div className="pb-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-brand">{formatEyebrowDate(new Date())}</p>
        <h1 className="mt-0.5 font-heading text-[26px] font-extrabold tracking-tight text-ink">
          Une autre journée pour dead ça
        </h1>
      </div>

      {showSportAlert && (
        <button
          type="button"
          onClick={() => navigate('/sport')}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[#F6DDA6] bg-gradient-to-r from-[#FFF6E4] to-[#FFEFD0] p-3.5 text-left shadow-sm"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-white shadow-[0_3px_8px_-3px_rgba(245,158,11,.5)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="2.2" strokeLinecap="round" className="h-[19px] w-[19px]">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div className="flex-1">
            <strong className="block text-[13px] font-bold text-[#7A5410]">Saisie du jour manquante</strong>
            <span className="text-[11.5px] text-[#A9863F]">Tu n'as pas encore rentré tes calories aujourd'hui</span>
          </div>
          <span className="text-xl text-amber">›</span>
        </button>
      )}

      {totalActive > 0 && (
        <div className="relative mb-5 flex items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-2 p-5 shadow-[0_16px_30px_-12px_rgba(91,108,255,.6)]">
          <div className="relative z-10 h-[94px] w-[94px] flex-shrink-0">
            <svg width="94" height="94" viewBox="0 0 94 94" className="-rotate-90">
              <circle cx="47" cy="47" r="40" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="9" />
              <circle
                cx="47"
                cy="47"
                r="40"
                fill="none"
                stroke="#fff"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <b className="font-heading text-[27px] font-extrabold leading-none">
                {doneToday}
                <small className="text-[15px]">/{totalActive}</small>
              </b>
              <small className="mt-0.5 text-[10px] opacity-85">aujourd'hui</small>
            </div>
          </div>
          <div className="relative z-10 text-white">
            <h3 className="font-heading text-base font-extrabold">Objectifs du jour</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed opacity-90">
              {doneToday} validé{doneToday > 1 ? 's' : ''} sur {totalActive} aujourd'hui.
            </p>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-baseline justify-between px-1">
        <b className="font-heading text-[15px] font-extrabold text-ink">Mes challenges</b>
        <span className="text-[11px] text-muted-2">
          {totalActive} actif{totalActive > 1 ? 's' : ''}
          {latestEndDate ? ` · fin le ${formatShortFr(new Date(latestEndDate))}` : ''}
        </span>
      </div>

      {!challengesQuery.isLoading && challenges.length === 0 && (
        <p className="mb-4 text-sm text-muted">Aucun challenge pour l'instant.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {activeChallenges.map((challenge) => {
          const card = cards.find((c) => c.challenge.id === challenge.id);
          const style = categoryStyle(challenge.category);
          const isSport = challenge.category === 'sport';

          const badge =
            isSport && card?.sportBalance !== null && card?.sportZone
              ? `${fmtSigned(card.sportBalance!)} kcal`
              : card
                ? `${card.adherencePct}%`
                : '…';
          const badgeColor = isSport && card?.sportZone ? `var(--color-${card.sportZone.zone})` : style.textColor;

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
              onClick={() => (isSport ? navigate('/sport') : undefined)}
              disabled={!isSport}
              className={`flex items-center gap-3.5 rounded-[20px] border border-line bg-card p-3.5 text-left shadow-sm transition-transform ${isSport ? 'active:scale-[.99]' : 'cursor-default opacity-90'}`}
            >
              <div
                className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[14px]"
                style={{ background: style.iconBg, color: style.iconFg }}
              >
                <CategoryIconGlyph icon={style.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="truncate font-heading text-sm font-bold text-ink">{challenge.title}</h4>
                  <span className="flex-shrink-0 font-heading text-[13px] font-extrabold" style={{ color: badgeColor }}>
                    {badge}
                  </span>
                </div>
                <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-line-2">
                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: style.barColor }} />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                  {sub}
                  {!isSport && <span className="rounded-full bg-line-2 px-1.5 py-0.5 font-mono text-[9px] text-muted-2">écran à venir</span>}
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate('/challenges/new')}
          className="flex items-center justify-center gap-2 rounded-[20px] border border-dashed border-line-2 p-3.5 font-mono text-xs text-muted"
        >
          + Nouveau challenge
        </button>
      </div>

      <div className="mx-auto mt-8 flex justify-center gap-4">
        <Link to="/settings" className="font-mono text-xs text-muted-2 underline">
          Réglages
        </Link>
        <button type="button" onClick={() => void signOut()} className="font-mono text-xs text-muted-2 underline">
          Se déconnecter
        </button>
      </div>

      <p className="mt-3 text-center font-mono text-[10px] text-muted-2">
        v{__APP_VERSION__} ·{' '}
        {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
