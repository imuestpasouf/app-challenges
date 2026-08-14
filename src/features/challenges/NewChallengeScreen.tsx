import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createChallenge, type NewChallengeField } from '../../api/challenges';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { addDays, todayKey, toDateKey } from '../../lib/date';
import type { FieldType } from '../../domain/types';

interface FieldDraft {
  label: string;
  unit: string;
  fieldType: FieldType;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  number: 'Nombre',
  text: 'Texte',
  boolean: 'Oui/Non',
  duration: 'Durée',
};

function emptyField(): FieldDraft {
  return { label: '', unit: '', fieldType: 'number' };
}

export function NewChallengeScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sport');
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(toDateKey(addDays(new Date(), 90)));
  const [fields, setFields] = useState<FieldDraft[]>([
    { label: 'Calories ingérées', unit: 'kcal', fieldType: 'number' },
    { label: 'Calories brûlées', unit: 'kcal', fieldType: 'number' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payloadFields: NewChallengeField[] = fields
        .filter((f) => f.label.trim().length > 0)
        .map((f, i) => ({
          label: f.label.trim(),
          fieldType: f.fieldType,
          unit: f.unit.trim() || null,
          isRequired: true,
          displayOrder: i,
        }));
      if (payloadFields.length === 0) throw new Error('Ajoute au moins un champ.');
      return createChallenge({ title: title.trim(), category: category.trim(), startDate, endDate, fields: payloadFields });
    },
    onSuccess: (challenge) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      navigate(challenge.category === 'sport' ? '/sport' : '/');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'),
  });

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError('Le titre doit faire au moins 3 caractères.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-6">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Nouveau challenge</p>
      <h1 className="mt-1 font-heading text-2xl font-extrabold text-ink">Créer un challenge</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input id="title" label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Perte de poids" required />
        <Input
          id="category"
          label="Catégorie"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="sport"
          required
        />
        <p className="-mt-2 text-xs text-muted-2">
          Utilise <span className="font-mono text-ink">sport</span> pour que l'écran Sport (balance calorique) affiche ce challenge.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input id="startDate" label="Début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Input id="endDate" label="Fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>

        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-sm font-bold text-ink">Champs de saisie</span>
            <button
              type="button"
              onClick={() => setFields((prev) => [...prev, emptyField()])}
              className="font-mono text-xs text-brand underline"
            >
              + ajouter un champ
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {fields.map((field, i) => (
              <div key={i} className="rounded-2xl border border-line bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <input
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Label (ex: Calories ingérées)"
                    className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="font-mono text-xs text-red"
                    aria-label="Supprimer le champ"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={field.unit}
                    onChange={(e) => updateField(i, { unit: e.target.value })}
                    placeholder="Unité (ex: kcal)"
                    className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink outline-none focus:border-brand"
                  />
                  <select
                    value={field.fieldType}
                    onChange={(e) => updateField(i, { fieldType: e.target.value as FieldType })}
                    className="rounded-xl border border-line bg-bg px-2 py-2 text-xs text-ink outline-none focus:border-brand"
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-bg px-3 py-2 text-sm text-red">{error}</p>}

        <Button type="submit" loading={mutation.isPending} className="mt-2">
          {mutation.isPending ? 'Création…' : 'Créer le challenge'}
        </Button>
      </form>
    </div>
  );
}
