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
    <section className="page-enter screen">
      <div className="ltitle">
        <div className="k">Nouveau challenge</div>
        <h1 style={{ fontSize: 24 }}>Créer un challenge</h1>
      </div>

      <div className="glass gcard">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input id="title" label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Perte de poids" required />
          <Input id="category" label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="sport" required />
          <p className="note" style={{ marginTop: -8, textAlign: 'left' }}>
            Utilise <b>sport</b> pour que l'écran Sport (balance calorique) affiche ce challenge.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input id="startDate" label="Début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <Input id="endDate" label="Fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Champs de saisie</span>
              <button
                type="button"
                onClick={() => setFields((prev) => [...prev, emptyField()])}
                style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                + ajouter un champ
              </button>
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fields.map((field, i) => (
                <div key={i} className="field-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      placeholder="Label (ex: Calories ingérées)"
                      className="plain-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      aria-label="Supprimer le champ"
                      style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                      value={field.unit}
                      onChange={(e) => updateField(i, { unit: e.target.value })}
                      placeholder="Unité (ex: kcal)"
                      className="plain-input"
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <select
                      value={field.fieldType}
                      onChange={(e) => updateField(i, { fieldType: e.target.value as FieldType })}
                      className="plain-input"
                      style={{ width: 110, fontSize: 12 }}
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

          {error && (
            <p className="note" style={{ color: 'var(--red)', textAlign: 'left' }}>
              {error}
            </p>
          )}

          <Button type="submit" loading={mutation.isPending} className="mt-2">
            {mutation.isPending ? 'Création…' : 'Créer le challenge'}
          </Button>
        </form>
      </div>
    </section>
  );
}
