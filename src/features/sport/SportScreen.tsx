import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChallengeByCategory, listFields } from '../../api/challenges';
import { listEntries, upsertEntry } from '../../api/entries';
import { zone } from '../../domain/calories';
import { counters as computeCounters, dayIndex, targetAt, trackStatus, trajectoryNodes } from '../../domain/resurrection';
import { findBurnedField, findEatenField } from '../../lib/fieldMatch';
import { todayKey } from '../../lib/date';
import { ZONE_HEX, ZONE_NAME, hexA } from '../../lib/color';
import { RESURRECTION_ACTIVATED_EVENT } from '../../lib/resurrectionEvent';
import { useResurrectionData } from '../resurrection/useResurrectionData';
import { ConfigSheet } from '../resurrection/ConfigSheet';
import { WeighSheet } from '../resurrection/WeighSheet';
import { MilestonesList } from '../resurrection/MilestonesList';
import { CombinedChart } from '../resurrection/CombinedChart';

const RANGE_MIN = -1800;
const RANGE_MAX = 900;
const SPAN = RANGE_MAX - RANGE_MIN;
const SEGMENTS: [number, number, keyof typeof ZONE_HEX][] = [
  [-1800, -1000, 'green'],
  [-1000, 0, 'amber'],
  [0, 500, 'red'],
  [500, 900, 'black'],
];

function pctOf(balance: number) {
  return Math.max(0, Math.min(100, ((balance - RANGE_MIN) / SPAN) * 100));
}

function fmt(n: number) {
  return (n > 0 ? '+' : '') + n;
}

export function SportScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayKey();

  const challengeQuery = useQuery({
    queryKey: ['challenges', 'sport'],
    queryFn: () => getChallengeByCategory('sport'),
  });
  const challenge = challengeQuery.data;

  const fieldsQuery = useQuery({
    queryKey: ['challenge-fields', challenge?.id],
    queryFn: () => listFields(challenge!.id),
    enabled: !!challenge,
  });
  const fields = fieldsQuery.data ?? [];
  const eatField = findEatenField(fields);
  const burnField = findBurnedField(fields);

  const entriesQuery = useQuery({
    queryKey: ['entries', challenge?.id, today],
    queryFn: () => listEntries(challenge!.id, { from: today, to: today }),
    enabled: !!challenge,
  });

  const [eatInput, setEatInput] = useState('');
  const [burnInput, setBurnInput] = useState('');
  const [loadedEntriesAt, setLoadedEntriesAt] = useState<number | null>(null);

  if (entriesQuery.dataUpdatedAt !== 0 && entriesQuery.dataUpdatedAt !== loadedEntriesAt) {
    setLoadedEntriesAt(entriesQuery.dataUpdatedAt);
    const eatEntry = entriesQuery.data?.find((e) => e.fieldId === eatField?.id);
    const burnEntry = entriesQuery.data?.find((e) => e.fieldId === burnField?.id);
    setEatInput(eatEntry?.value ?? '');
    setBurnInput(burnEntry?.value ?? '');
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!challenge || !eatField || !burnField) throw new Error('Champs manquants');
      await Promise.all([
        upsertEntry({ challengeId: challenge.id, fieldId: eatField.id, entryDate: today, value: eatInput }),
        upsertEntry({ challengeId: challenge.id, fieldId: burnField.id, entryDate: today, value: burnInput }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', challenge?.id] });
    },
  });

  // ===== Mode Résurrection =====
  const resurrection = useResurrectionData();
  const { mode, isActive, milestones, weightEntries, currentWeight } = resurrection;

  const rangeEntriesQuery = useQuery({
    queryKey: ['entries', challenge?.id, 'resurrection-range', mode?.startDate],
    queryFn: () => listEntries(challenge!.id, { from: mode!.startDate, to: today }),
    enabled: !!challenge && !!eatField && !!burnField && isActive,
  });

  const dailyBalances = new Map<string, number>();
  if (isActive && rangeEntriesQuery.data) {
    const eatByDate = new Map<string, number>();
    const burnByDate = new Map<string, number>();
    for (const e of rangeEntriesQuery.data) {
      if (e.value === null) continue;
      const n = parseFloat(e.value);
      if (Number.isNaN(n)) continue;
      if (e.fieldId === eatField?.id) eatByDate.set(e.entryDate, n);
      if (e.fieldId === burnField?.id) burnByDate.set(e.entryDate, n);
    }
    for (const [date, eat] of eatByDate) {
      const burn = burnByDate.get(date);
      if (burn !== undefined) dailyBalances.set(date, Math.round(eat - burn));
    }
  }

  const [sheetOpen, setSheetOpen] = useState(false);
  const [weighOpen, setWeighOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }

  function openToggle() {
    if (isActive) {
      showToast('Le mode est déjà lancé. Tu peux ajuster les jalons dans les réglages.');
      return;
    }
    setSheetOpen(true);
  }

  async function handleConfigSubmit(input: Parameters<typeof resurrection.createMode>[0]) {
    await resurrection.createMode(input);
    setSheetOpen(false);
    window.dispatchEvent(new Event(RESURRECTION_ACTIVATED_EVENT));
    showToast(`🔥 Mode Résurrection lancé — ${(input.startWeight - input.targetWeight).toFixed(1)} kg à perdre`);
  }

  async function handleWeighSubmit(weight: number) {
    await resurrection.saveWeight(weight);
    setWeighOpen(false);
    showToast(`Pesée enregistrée : ${weight.toFixed(1)} kg`);
  }

  if (challengeQuery.isLoading) {
    return <div className="screen note">Chargement…</div>;
  }

  if (!challenge) {
    return (
      <section className="page-enter screen" style={{ textAlign: 'center' }}>
        <div className="glass gcard">
          <p style={{ fontSize: 18, fontWeight: 700 }}>Aucun challenge sport</p>
          <p className="note" style={{ marginTop: 8 }}>
            Crée un challenge avec la catégorie <b>sport</b> pour voir cet écran.
          </p>
          <Link to="/challenges/new" style={{ color: 'var(--brand)', display: 'inline-block', marginTop: 12, fontWeight: 600 }}>
            Créer un challenge
          </Link>
        </div>
      </section>
    );
  }

  const eatValue = parseFloat(eatInput);
  const burnValue = parseFloat(burnInput);
  const hasBalance = !Number.isNaN(eatValue) && !Number.isNaN(burnValue);
  const balance = hasBalance ? Math.round(eatValue - burnValue) : null;
  const z = balance !== null ? zone(balance) : null;
  const color = z ? ZONE_HEX[z.zone] : ZONE_HEX.amber;

  // valeurs dérivées du mode Résurrection actif
  let targetToday = 0;
  let cnt: ReturnType<typeof computeCounters> | null = null;
  let track: ReturnType<typeof trackStatus> | null = null;
  if (isActive && mode) {
    const nodes = trajectoryNodes(mode, milestones);
    targetToday = targetAt(dayIndex(new Date(), new Date(mode.startDate)), nodes);
    cnt = computeCounters(mode, currentWeight, new Date());
    track = trackStatus(currentWeight, targetToday, mode.targetWeight, cnt.daysLeft);
  }

  return (
    <section className="page-enter screen">
      {!isActive && (
        <div className="ltitle">
          <div className="k">Challenge sport · aujourd'hui</div>
          <h1>Balance du jour</h1>
        </div>
      )}

      {isActive && mode && cnt && (
        <div className="glass rescounter">
          <div className="ctop">
            <span>MODE RÉSURRECTION</span>
            <span className="live">
              <i />
              ACTIF
            </span>
          </div>
          <div className="cgrid">
            <div className="cbox">
              <div className="n">{cnt.daysLeft}</div>
              <div className="l">JOURS RESTANTS</div>
            </div>
            <div className="csep" />
            <div className="cbox">
              <div className="n">
                {cnt.kgLeft.toFixed(1)}
                <small>kg</small>
              </div>
              <div className="l">RESTE À PERDRE</div>
            </div>
          </div>
          <div className="cbar">
            <i style={{ width: `${cnt.timeProgress}%` }} />
          </div>
          <div className="cends">
            <span>
              Jour {cnt.elapsed} / {cnt.total}
            </span>
            <span>
              {new Date(mode.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} →{' '}
              {new Date(mode.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {!isActive && (
        <div className="glass togcard">
          <div className="togtop">
            <div className="togico">🔥</div>
            <div className="togmeta">
              <b>Mode Résurrection</b>
              <span>Compte à rebours intensif</span>
            </div>
            <button type="button" className="switch" onClick={openToggle} aria-label="Activer le mode Résurrection">
              <i />
            </button>
          </div>
          <div className="togdesc">
            Fixe un poids de départ, un objectif final et une échéance. Ton app passe en mode sombre et affiche en permanence le décompte des jours et des
            kilos restants. Toutes les fonctionnalités existantes sont conservées. Réglage personnel : l'app de l'autre n'est pas modifiée.
          </div>
        </div>
      )}

      {isActive && mode && track && cnt && (
        <>
          <div className="now">
            <div className="glass nowcard">
              <div className="k">POIDS ACTUEL</div>
              <div className="v">
                {currentWeight.toFixed(1)}
                <small> kg</small>
              </div>
              <div className="d" style={{ color: 'var(--green)' }}>
                −{(mode.startWeight - currentWeight).toFixed(1)} kg depuis le départ
              </div>
            </div>
            <div className="glass nowcard">
              <div className="k">CIBLE DU JOUR</div>
              <div className="v">
                {targetToday.toFixed(1)}
                <small> kg</small>
              </div>
              <div className="d" style={{ color: track.gap <= 0 ? 'var(--green)' : track.gap <= 1 ? 'var(--amber)' : 'var(--red)' }}>
                {track.gap <= 0 ? `${Math.abs(track.gap).toFixed(1)} kg d'avance` : `${track.gap.toFixed(1)} kg de retard`}
              </div>
            </div>
          </div>

          <div
            className="glass rverdict"
            style={{ background: track.status === 'ahead' ? 'rgba(48,209,88,.14)' : track.status === 'slightly_behind' ? 'rgba(255,214,10,.14)' : 'rgba(255,69,58,.14)' }}
          >
            <span className="em">{track.status === 'ahead' ? '🔥' : track.status === 'slightly_behind' ? '⚡' : '🎯'}</span>
            <div className="t">
              <b>{track.status === 'ahead' ? 'Dans les temps' : track.status === 'slightly_behind' ? 'Légèrement en retard' : 'Trajectoire à ajuster'}</b>
              <span>
                Reste {Math.max(0, currentWeight - mode.targetWeight).toFixed(1)} kg · {track.weeklyPaceNeeded.toFixed(2)} kg/sem sur {cnt.daysLeft} jours
              </span>
            </div>
          </div>

          <button type="button" className="cta" onClick={() => setWeighOpen(true)}>
            Peser aujourd'hui
          </button>

          <div className="lbl">
            <span>CALORIES DU JOUR</span>
            <span>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
          </div>
        </>
      )}

      <div className="glass hero" style={{ background: hexA(color, 0.22) }}>
        <div className="lab">
          Mangé – Brûlé{' '}
          {z && (
            <span className="chip" style={{ background: hexA(color, 0.22), color }}>
              {ZONE_NAME[z.zone]}
            </span>
          )}
        </div>
        <div className="net">
          {balance !== null ? fmt(balance) : '–'}
          <span className="unit">kcal</span>
        </div>
        <div className="verdict" style={{ color: z ? color : undefined }}>
          {z ? z.label : 'Renseigne tes calories du jour'}
        </div>
      </div>

      <div className="split">
        <div className="glass mini keat">
          <div className="k">
            <span className="kd">
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                <path d="M15 11h.01" />
                <path d="M11 15h.01" />
                <path d="M16 16h.01" />
                <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16" />
              </svg>
            </span>
            {eatField?.label ?? 'Calories ingérées'}
          </div>
          <input type="number" inputMode="numeric" value={eatInput} onChange={(e) => setEatInput(e.target.value)} placeholder="0" />
        </div>
        <div className="glass mini kburn">
          <div className="k">
            <span className="kd">
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                <path d="M12 2c1 3-1 5-1 7a3 3 0 0 0 6 0c0-1 0-2-1-3 3 2 4 5 4 8a7 7 0 1 1-14 0c0-4 3-6 5-9 1 3 2 4 2 4" />
              </svg>
            </span>
            {burnField?.label ?? 'Calories brûlées'}
          </div>
          <input type="number" inputMode="numeric" value={burnInput} onChange={(e) => setBurnInput(e.target.value)} placeholder="0" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={!eatField || !burnField || eatInput === '' || burnInput === '' || saveMutation.isPending}
        style={{
          width: '100%',
          borderRadius: 22,
          padding: '13px',
          fontWeight: 700,
          color: '#fff',
          background: 'linear-gradient(135deg, #4C5BD4, #8B5CD6)',
          border: 'none',
          boxShadow: 'var(--rim), 0 8px 18px -6px rgba(76,91,212,.5)',
          marginBottom: 12,
          opacity: !eatField || !burnField || eatInput === '' || burnInput === '' ? 0.6 : 1,
        }}
      >
        {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer la saisie du jour'}
      </button>
      {saveMutation.isSuccess && (
        <p className="note" style={{ color: 'var(--green)', marginTop: -6, marginBottom: 12 }}>
          Saisie enregistrée ✓
        </p>
      )}
      {(!eatField || !burnField) && (
        <p className="note" style={{ color: 'var(--red)', marginTop: -6, marginBottom: 12 }}>
          Ce challenge n'a pas de champ reconnu comme "calories ingérées" / "calories brûlées".
        </p>
      )}

      <div className="glass gcard">
        <div className="hd">Où tu te situes aujourd'hui</div>
        <div style={{ position: 'relative' }}>
          <div className="gauge">
            {SEGMENTS.map(([a, b, c]) => (
              <div key={c} className="seg" style={{ width: `${((b - a) / SPAN) * 100}%`, background: ZONE_HEX[c] }} />
            ))}
          </div>
          {balance !== null && <div className="marker" style={{ left: `calc(${pctOf(balance)}% - 2.5px)` }} />}
        </div>
        <div className="scale">
          <span>−1800</span>
          <span>−900</span>
          <span>0</span>
          <span>+900</span>
        </div>
        <div className="zl-wrap">
          {[
            ['green', '≤ −1000'],
            ['amber', '−1000 → 0'],
            ['red', '0 → +500'],
            ['black', '> +500'],
          ].map(([c, label]) => (
            <div key={c} className="zl">
              <i style={{ background: ZONE_HEX[c as keyof typeof ZONE_HEX] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <p className="note">Saisie manuelle en V1 · récupération auto Apple Santé prévue en V2</p>

      {isActive && mode && (
        <>
          <CombinedChart mode={mode} milestones={milestones} weightEntries={weightEntries} dailyBalances={dailyBalances} isDark />
          <MilestonesList mode={mode} milestones={milestones} weightEntries={weightEntries} currentWeight={currentWeight} />

          <div className="lbl" style={{ marginTop: 18 }}>
            <span>LE RESTE DE L'APP</span>
            <span>inchangé</span>
          </div>
          <div className="glass" style={{ borderRadius: 30, padding: 6, marginBottom: 14 }}>
            <button type="button" className="ms" style={{ background: 'transparent', width: '100%', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => navigate('/history')}>
              <div className="ic" style={{ background: 'rgba(255,255,255,.09)' }}>
                📊
              </div>
              <div className="m">
                <b>Historique &amp; mosaïque</b>
                <span>Balance calorique, moyennes glissantes</span>
              </div>
              <div className="r" style={{ fontSize: 20, color: 'var(--text-3)' }}>
                ›
              </div>
            </button>
            <button type="button" className="ms" style={{ background: 'transparent', width: '100%', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => navigate('/reading')}>
              <div className="ic" style={{ background: 'rgba(255,255,255,.09)' }}>
                📖
              </div>
              <div className="m">
                <b>Lecture partagée</b>
                <span>Inchangé côté partenaire</span>
              </div>
              <div className="r" style={{ fontSize: 20, color: 'var(--text-3)' }}>
                ›
              </div>
            </button>
            <button type="button" className="ms" style={{ background: 'transparent', width: '100%', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => navigate('/shopping')}>
              <div className="ic" style={{ background: 'rgba(255,255,255,.09)' }}>
                🛒
              </div>
              <div className="m">
                <b>Courses &amp; maison</b>
                <span>Budget, liste, inventaire</span>
              </div>
              <div className="r" style={{ fontSize: 20, color: 'var(--text-3)' }}>
                ›
              </div>
            </button>
          </div>
        </>
      )}

      <ConfigSheet open={sheetOpen} defaultStartWeight={resurrection.latestWeight?.weight ?? 0} onClose={() => setSheetOpen(false)} onSubmit={handleConfigSubmit} />
      <WeighSheet open={weighOpen} currentWeight={currentWeight} onClose={() => setWeighOpen(false)} onSubmit={handleWeighSubmit} />
      {toast && <div className="toast on">{toast}</div>}
    </section>
  );
}
