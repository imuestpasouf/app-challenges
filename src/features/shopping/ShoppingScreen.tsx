import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShoppingData } from './useShoppingData';
import { BudgetPane } from './BudgetPane';
import { ShoppingListPane } from './ShoppingListPane';
import { InventoryPane } from './InventoryPane';

type PaneKey = 'bud' | 'lst' | 'inv';

const PANES: { key: PaneKey; label: string }[] = [
  { key: 'bud', label: 'Budget' },
  { key: 'lst', label: 'Courses' },
  { key: 'inv', label: 'Inventaire' },
];

export function ShoppingScreen() {
  const navigate = useNavigate();
  const {
    myId,
    myName,
    partner,
    budget,
    setBudget,
    expenses,
    addExpense,
    shoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    clearCheckedItems,
    inventoryItems,
    addInventoryItem,
    adjustInventoryQuantity,
  } = useShoppingData();

  const [pane, setPane] = useState<PaneKey>('bud');
  const segRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Partial<Record<PaneKey, HTMLButtonElement>>>({});

  function moveThumb() {
    const seg = segRef.current;
    const btn = btnRefs.current[pane];
    const thumb = thumbRef.current;
    if (!seg || !btn || !thumb) return;
    const b = btn.getBoundingClientRect();
    const s = seg.getBoundingClientRect();
    thumb.style.left = `${b.left - s.left}px`;
    thumb.style.width = `${b.width}px`;
  }

  useEffect(() => {
    moveThumb();
    const timeout = setTimeout(moveThumb, 60);
    window.addEventListener('resize', moveThumb);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', moveThumb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane]);

  function handlePushLow() {
    const lowLabels = new Set(
      inventoryItems.filter((i) => i.quantity <= i.minQty).map((i) => i.label)
    );
    const alreadyOnList = new Set(shoppingItems.filter((i) => !i.checked).map((i) => i.label));
    for (const label of lowLabels) {
      if (!alreadyOnList.has(label)) addShoppingItem(label);
    }
    setPane('lst');
  }

  return (
    <section className="push-enter screen">
      <div className="navback">
        <button type="button" className="backbtn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span>Accueil</span>
      </div>

      <div className="ltitle" style={{ paddingTop: 4 }}>
        <div className="k">Partagé avec {partner?.name ?? '…'}</div>
        <h1>Courses & maison</h1>
      </div>

      <div className="seg" ref={segRef}>
        <div className="thumb" ref={thumbRef} />
        {PANES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={key === pane ? 'on' : ''}
            ref={(el) => {
              btnRefs.current[key] = el ?? undefined;
            }}
            onClick={() => setPane(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {pane === 'bud' && (
        <BudgetPane myId={myId} myName={myName} partner={partner} budget={budget} expenses={expenses} onSetBudget={setBudget} onAddExpense={addExpense} />
      )}
      {pane === 'lst' && (
        <ShoppingListPane
          items={shoppingItems}
          myId={myId}
          myName={myName}
          partner={partner}
          onAdd={addShoppingItem}
          onToggle={toggleShoppingItem}
          onClearChecked={clearCheckedItems}
        />
      )}
      {pane === 'inv' && <InventoryPane items={inventoryItems} onAdjust={adjustInventoryQuantity} onAdd={addInventoryItem} onPushLow={handlePushLow} />}
    </section>
  );
}
