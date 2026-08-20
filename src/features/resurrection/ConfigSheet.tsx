import { useState } from 'react';
import { generateMilestones, type GeneratedMilestone } from '../../domain/resurrection';
import { todayKey } from '../../lib/date';

const round1 = (n: number) => Math.round(n * 10) / 10;

interface ConfigSheetProps {
  open: boolean;
  defaultStartWeight: number;
  onClose: () => void;
  onSubmit: (input: { startDate: string; endDate: string; startWeight: number; targetWeight: number; milestones: GeneratedMilestone[] }) => void;
}

function initialState(defaultStartWeight: number, start: Date) {
  const w0 = defaultStartWeight || 80;
  const wf = Math.max(40, w0 - 10);
  return { w0, wf, months: 3, msWeights: generateMilestones(w0, wf, 3, start).map((m) => m.targetWeight) };
}

export function ConfigSheet({ open, defaultStartWeight, onClose, onSubmit }: ConfigSheetProps) {
  const [start] = useState(() => new Date());
  const [state, setState] = useState(() => initialState(defaultStartWeight, start));
  const { w0, wf, months, msWeights } = state;
  const setW0 = (n: number) => setState((s) => ({ ...s, w0: n }));
  const setWf = (n: number) => setState((s) => ({ ...s, wf: n }));
  const setMsWeights = (fn: (prev: number[]) => number[]) => setState((s) => ({ ...s, msWeights: fn(s.msWeights) }));

  // Re-seed from the latest known weight each time the sheet is (re)opened — adjusting state during
  // render (React's documented pattern) rather than in an effect, to avoid an extra render pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setState(initialState(defaultStartWeight, start));
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function endDate() {
    const d = new Date(start);
    d.setMonth(d.getMonth() + months);
    return d;
  }
  function msDate(i: number) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i + 1);
    return d;
  }

  function setMonthsAndRegenerate(next: number) {
    const m = Math.max(1, Math.min(12, next));
    setState((s) => ({ ...s, months: m, msWeights: generateMilestones(s.w0, s.wf, m, start).map((x) => x.targetWeight) }));
  }

  function adjMs(i: number, d: number) {
    setMsWeights((prev) => prev.map((w, idx) => (idx === i ? round1(w + d) : w)));
  }

  const totalDaysCount = Math.round((endDate().getTime() - start.getTime()) / 86_400_000);
  const kg = w0 - wf;
  const pace = totalDaysCount > 0 ? (kg / totalDaysCount) * 7 : 0;

  function toDateKeyOf(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function handleSubmit() {
    const milestones: GeneratedMilestone[] = msWeights.map((weight, i) => ({ position: i, targetDate: msDate(i), targetWeight: weight }));
    onSubmit({ startDate: todayKey(), endDate: toDateKeyOf(endDate()), startWeight: w0, targetWeight: wf, milestones });
  }

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={onClose} />
      <div className={`sheet${open ? ' open' : ''}`}>
        <div className="grab" />
        <h4>Activer le mode Résurrection</h4>
        <div className="sub">
          Réglage personnel — n'affecte que ton app.
          <br />
          Les jalons resteront modifiables.
        </div>

        <div className="mshdr">POINT DE DÉPART</div>
        <div className="frow">
          <div className="fl">
            Poids initial
            <small>Aujourd'hui</small>
          </div>
          <div className="stp">
            <button type="button" onClick={() => setW0(round1(w0 - 0.5))}>
              −
            </button>
            <span className="n">{w0.toFixed(1)}</span>
            <button type="button" onClick={() => setW0(round1(w0 + 0.5))}>
              +
            </button>
          </div>
        </div>

        <div className="mshdr">OBJECTIF</div>
        <div className="frow">
          <div className="fl">
            Poids visé
            <small>À l'échéance</small>
          </div>
          <div className="stp">
            <button type="button" onClick={() => setWf(Math.max(40, round1(wf - 0.5)))}>
              −
            </button>
            <span className="n">{wf.toFixed(1)}</span>
            <button type="button" onClick={() => setWf(Math.min(w0 - 1, round1(wf + 0.5)))}>
              +
            </button>
          </div>
        </div>
        <div className="frow">
          <div className="fl">
            Durée
            <small>Échéance : {endDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</small>
          </div>
          <div className="stp">
            <button type="button" onClick={() => setMonthsAndRegenerate(months - 1)}>
              −
            </button>
            <span className="n">{months} mois</span>
            <button type="button" onClick={() => setMonthsAndRegenerate(months + 1)}>
              +
            </button>
          </div>
        </div>

        {msWeights.length > 0 && (
          <>
            <div className="mshdr">JALONS</div>
            {msWeights.map((w, i) => (
              <div className="frow" key={i}>
                <div className="fl">
                  Jalon {i + 1}
                  <small>{msDate(i).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</small>
                </div>
                <div className="stp">
                  <button type="button" onClick={() => adjMs(i, -0.5)}>
                    −
                  </button>
                  <span className="n">{w.toFixed(1)} kg</span>
                  <button type="button" onClick={() => adjMs(i, 0.5)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="warn">
          <b>{kg.toFixed(1)} kg</b> en <b>{totalDaysCount} jours</b> · <b>{pace.toFixed(2)} kg/semaine</b>
        </div>

        <button type="button" className="confirm" onClick={handleSubmit}>
          Lancer le compte à rebours
        </button>
        <button type="button" className="cancel" onClick={onClose}>
          Annuler
        </button>
      </div>
    </>
  );
}
