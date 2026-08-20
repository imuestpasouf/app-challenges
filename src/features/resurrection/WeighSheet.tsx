import { useState } from 'react';
import { formatEyebrowDate } from '../../lib/date';

interface WeighSheetProps {
  open: boolean;
  currentWeight: number;
  onClose: () => void;
  onSubmit: (weight: number) => void;
}

export function WeighSheet({ open, currentWeight, onClose, onSubmit }: WeighSheetProps) {
  const [draft, setDraft] = useState(currentWeight);

  // Re-seed the draft from the current weight each time the sheet is (re)opened — adjusting state
  // during render (React's documented pattern) rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setDraft(currentWeight);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={onClose} />
      <div className={`sheet${open ? ' open' : ''}`}>
        <div className="grab" />
        <h4>Poids du jour</h4>
        <div className="sub">{formatEyebrowDate(new Date())}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '22px 0 18px' }}>
          <button type="button" className="stpbig" onClick={() => setDraft((d) => Math.round((d - 0.1) * 10) / 10)}>
            −
          </button>
          <div style={{ fontSize: 44, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.03em', minWidth: 150, textAlign: 'center' }}>
            {draft.toFixed(1)}
            <small style={{ fontSize: 18, color: 'var(--text-2)' }}> kg</small>
          </div>
          <button type="button" className="stpbig" onClick={() => setDraft((d) => Math.round((d + 0.1) * 10) / 10)}>
            +
          </button>
        </div>
        <button type="button" className="confirm" style={{ background: 'linear-gradient(135deg,#1DA65A,#12897F)' }} onClick={() => onSubmit(draft)}>
          Enregistrer
        </button>
        <button type="button" className="cancel" onClick={onClose}>
          Annuler
        </button>
      </div>
    </>
  );
}
