import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChallengeByCategory, listFields } from '../../api/challenges';
import { listEntries, upsertEntry } from '../../api/entries';
import { zone } from '../../domain/calories';
import { findBurnedField, findEatenField } from '../../lib/fieldMatch';
import { todayKey } from '../../lib/date';
import { ZONE_HEX, ZONE_NAME, hexA, shade } from '../../lib/color';
import { Button } from '../../components/Button';

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

  if (challengeQuery.isLoading) {
    return <div className="px-4 py-6 text-sm text-muted">Chargement…</div>;
  }

  if (!challenge) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="font-heading text-lg font-bold text-ink">Aucun challenge sport</p>
        <p className="text-sm text-muted">
          Crée un challenge avec la catégorie <span className="font-mono text-ink">sport</span> pour voir cet écran.
        </p>
        <Link to="/challenges/new" className="font-mono text-sm text-brand underline">
          Créer un challenge
        </Link>
      </div>
    );
  }

  const eatValue = parseFloat(eatInput);
  const burnValue = parseFloat(burnInput);
  const hasBalance = !Number.isNaN(eatValue) && !Number.isNaN(burnValue);
  const balance = hasBalance ? Math.round(eatValue - burnValue) : null;
  const z = balance !== null ? zone(balance) : null;
  const color = z ? ZONE_HEX[z.zone] : ZONE_HEX.amber;

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <div className="pb-4">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-brand">
          Challenge sport · aujourd'hui
        </p>
        <h1 className="mt-0.5 font-heading text-[22px] font-extrabold text-ink">Balance du jour</h1>
      </div>

      <div className="mb-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
        <p className="font-heading text-sm font-bold text-ink">Saisie du jour</p>
        <div className="mt-3 flex gap-3">
          <label className="flex-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
              {eatField?.label ?? 'Calories ingérées'}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={eatInput}
              onChange={(e) => setEatInput(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 font-heading text-lg font-bold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
              {burnField?.label ?? 'Calories brûlées'}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={burnInput}
              onChange={(e) => setBurnInput(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 font-heading text-lg font-bold text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
        <Button
          type="button"
          loading={saveMutation.isPending}
          loadingText="Enregistrement…"
          onClick={() => saveMutation.mutate()}
          disabled={!eatField || !burnField || eatInput === '' || burnInput === ''}
          className="mt-3"
        >
          Enregistrer la saisie du jour
        </Button>
        {saveMutation.isSuccess && <p className="mt-2 text-center text-xs text-green">Saisie enregistrée ✓</p>}
        {(!eatField || !burnField) && (
          <p className="mt-2 text-xs text-red">
            Ce challenge n'a pas de champ reconnu comme "calories ingérées" / "calories brûlées".
          </p>
        )}
      </div>

      <div
        className="mb-4 rounded-[28px] p-6 shadow-card"
        style={{
          background: `linear-gradient(140deg, ${color}, ${shade(color, -18)})`,
          boxShadow: `0 18px 34px -14px ${hexA(color, 0.7)}`,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <span>Mangé – Brûlé</span>
          {z && (
            <span className="rounded-full bg-white/25 px-2.5 py-1 font-heading text-[10px] font-extrabold uppercase tracking-wide text-white">
              {ZONE_NAME[z.zone]}
            </span>
          )}
        </div>
        <div className="mt-2.5 font-heading text-[56px] font-black leading-none tracking-tight text-white tabular-nums">
          {balance !== null ? fmt(balance) : '–'}
          <span className="ml-1 text-base font-bold text-white/75">kcal</span>
        </div>
        <div className="mt-1 text-sm font-bold text-white/95">{z ? z.label : 'Renseigne tes calories du jour'}</div>
      </div>

      <div className="mb-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
        <p className="mb-5 font-heading text-sm font-bold text-ink">Où tu te situes aujourd'hui</p>
        <div className="relative">
          <div className="flex h-[18px] overflow-hidden rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
            {SEGMENTS.map(([a, b, c]) => (
              <div key={c} style={{ width: `${((b - a) / SPAN) * 100}%`, background: ZONE_HEX[c] }} />
            ))}
          </div>
          {balance !== null && (
            <div
              className="absolute -top-2 h-[34px] w-1 rounded-full bg-ink shadow-[0_0_0_4px_#fff,0_3px_8px_rgba(0,0,0,.35)] transition-[left]"
              style={{ left: `calc(${pctOf(balance)}% - 2px)` }}
            />
          )}
        </div>
        <div className="mt-4 flex justify-between font-mono text-[10px] font-semibold text-muted-2 tabular-nums">
          <span>−1800</span>
          <span>−900</span>
          <span>0</span>
          <span>+900</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-2">
          {[
            ['green', '≤ −1000'],
            ['amber', '−1000 → 0'],
            ['red', '0 → +500'],
            ['black', '> +500'],
          ].map(([c, label]) => (
            <div key={c} className="flex items-center gap-1.5 text-[10.5px] text-muted">
              <i className="h-2.5 w-2.5 rounded" style={{ background: ZONE_HEX[c as keyof typeof ZONE_HEX] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-2">
        Saisie manuelle en V1 · récupération auto Apple Santé prévue en V2
      </p>
    </div>
  );
}
