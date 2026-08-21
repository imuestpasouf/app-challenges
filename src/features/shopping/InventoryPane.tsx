import { useState } from 'react';
import { stockStatus } from '../../domain/inventory';
import type { InventoryItem } from '../../domain/types';

interface InventoryPaneProps {
  items: InventoryItem[];
  onAdjust: (id: string, currentQuantity: number, delta: number) => void;
  onAdd: (input: { label: string; icon: string | null; unit: string | null; minQty: number }) => void;
  onPushLow: () => void;
}

const STATUS_LABEL: Record<ReturnType<typeof stockStatus>, string> = {
  epuise: 'Épuisé',
  bas: 'Stock bas',
  ok: 'En stock',
};

const STATUS_CLASS: Record<ReturnType<typeof stockStatus>, string> = {
  epuise: 'low',
  bas: 'mid-st',
  ok: 'ok',
};

export function InventoryPane({ items, onAdjust, onAdd, onPushLow }: InventoryPaneProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');
  const [minQty, setMinQty] = useState('1');
  const [toast, setToast] = useState<string | null>(null);

  const low = items.filter((i) => stockStatus(i) !== 'ok');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function handleAdd() {
    const trimmed = label.trim();
    const parsedMin = parseFloat(minQty.replace(',', '.'));
    if (!trimmed || Number.isNaN(parsedMin)) return;
    onAdd({ label: trimmed, icon: '📦', unit: unit.trim() || null, minQty: parsedMin });
    setLabel('');
    setUnit('');
    setMinQty('1');
    setAddOpen(false);
  }

  async function handleCopyNames() {
    if (items.length === 0) return;
    const text = items.map((i) => i.label).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${items.length} article${items.length > 1 ? 's' : ''} copié${items.length > 1 ? 's' : ''} 📋`);
    } catch {
      showToast('Impossible de copier — vérifie les autorisations du navigateur');
    }
  }

  return (
    <section className="pane on">
      {low.length > 0 && (
        <div className="glass banner">
          <div className="d">⚠️</div>
          <div className="t">
            <b>
              {low.length} produit{low.length > 1 ? 's' : ''} à racheter
            </b>
            <span>Ajoute-les à la liste de courses</span>
          </div>
          <button type="button" className="go" onClick={onPushLow}>
            Ajouter
          </button>
        </div>
      )}

      <div className="lbl">
        <span>PROVISIONS</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {items.length} articles
          <button
            type="button"
            onClick={() => void handleCopyNames()}
            disabled={items.length === 0}
            title="Copier les noms des articles"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              background: 'rgba(255,255,255,.5)',
              boxShadow: 'var(--rim)',
              color: 'var(--brand)',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 99,
              cursor: items.length === 0 ? 'default' : 'pointer',
              opacity: items.length === 0 ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            📋 Copier la liste
          </button>
        </span>
      </div>

      {!addOpen ? (
        <button type="button" className="dashed-row" onClick={() => setAddOpen(true)}>
          + Ajouter un produit
        </button>
      ) : (
        <div className="field-card" style={{ marginBottom: 14 }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom du produit" className="plain-input" style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unité (kg, L…)" className="plain-input" style={{ flex: 1 }} />
            <input
              type="number"
              inputMode="decimal"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              placeholder="Seuil"
              className="plain-input"
              style={{ width: 90 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={handleAdd}
              style={{ flex: 1, borderRadius: 16, padding: '10px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #4C5BD4, #8B5CD6)', border: 'none' }}
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              style={{ borderRadius: 16, padding: '10px 16px', fontWeight: 600, background: 'rgba(255,255,255,.5)', border: 'none', color: 'var(--text-2)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="glass lst">
        {items.length === 0 && <div className="empty">Aucune provision pour l'instant</div>}
        {items.map((item) => {
          const status = stockStatus(item);
          return (
            <div key={item.id} className={`inv ${STATUS_CLASS[status]}`}>
              <div className="ic">{item.icon ?? '📦'}</div>
              <div className="mid">
                <b>{item.label}</b>
                <div className="st">
                  {STATUS_LABEL[status]} · {item.quantity} {item.unit ?? ''}
                </div>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => onAdjust(item.id, item.quantity, -1)}>
                  −
                </button>
                <span className="q">{item.quantity}</span>
                <button type="button" onClick={() => onAdjust(item.id, item.quantity, 1)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {toast && <div className="toast on">{toast}</div>}
    </section>
  );
}
