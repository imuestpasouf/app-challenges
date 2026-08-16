import { useState } from 'react';
import type { ShoppingItem } from '../../domain/types';

interface ShoppingListPaneProps {
  items: ShoppingItem[];
  myId: string | null;
  myName: string | null;
  partner: { id: string; name: string } | null;
  onAdd: (label: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  onClearChecked: () => void;
}

function addedByName(item: ShoppingItem, myId: string | null, myName: string | null, partner: { id: string; name: string } | null) {
  if (item.addedBy === myId) return myName ?? 'toi';
  if (item.addedBy === partner?.id) return partner.name;
  return '…';
}

export function ShoppingListPane({ items, myId, myName, partner, onAdd, onToggle, onClearChecked }: ShoppingListPaneProps) {
  const [value, setValue] = useState('');

  const todo = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  function handleAdd() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <section className="pane on">
      <div className="addrow">
        <div className="addfield">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Ajouter un article…"
            autoComplete="off"
          />
        </div>
        <button type="button" className="addbtn" onClick={handleAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="lbl">
        <span>À ACHETER</span>
        <span>{todo.length} article{todo.length > 1 ? 's' : ''}</span>
      </div>
      <div className="glass lst">
        {todo.length === 0 && <div className="empty">Rien à acheter 🎉</div>}
        {todo.map((item) => (
          <div key={item.id} className="item" onClick={() => onToggle(item.id, true)}>
            <div className="check">
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="txt">
              <b>{item.label}</b>
              <span>ajouté par {addedByName(item, myId, myName, partner)}</span>
            </div>
            {item.qty && <div className="qty">{item.qty}</div>}
          </div>
        ))}
      </div>

      <div className="lbl">
        <span>DANS LE PANIER</span>
        <span>{done.length} coché{done.length > 1 ? 's' : ''}</span>
      </div>
      <div className="glass lst">
        {done.length === 0 && <div className="empty">Aucun article coché</div>}
        {done.map((item) => (
          <div key={item.id} className="item done" onClick={() => onToggle(item.id, false)}>
            <div className="check">
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="txt">
              <b>{item.label}</b>
              <span>ajouté par {addedByName(item, myId, myName, partner)}</span>
            </div>
            {item.qty && <div className="qty">{item.qty}</div>}
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <button type="button" className="dashed-row" onClick={onClearChecked}>
          Vider le panier
        </button>
      )}
    </section>
  );
}
