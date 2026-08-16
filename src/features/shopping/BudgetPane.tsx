import { useState } from 'react';
import { budgetProgress } from '../../domain/budget';
import { BUDGET_ZONE_HEX } from '../../lib/color';
import { CATEGORY_ICON, CATEGORY_LABEL, EXPENSE_CATEGORIES, eur, type ExpenseCategory } from './constants';
import type { Expense, MonthlyBudget } from '../../domain/types';
import { todayKey } from '../../lib/date';

const MONTH_NAME = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date());
const MONTH_PREFIX = /^[aeiouéèêàâîôû]/i.test(MONTH_NAME) ? "D'" : 'DE ';
const MONTH_LABEL = `${MONTH_PREFIX}${MONTH_NAME.toUpperCase()}`;

interface BudgetPaneProps {
  myId: string | null;
  myName: string | null;
  partner: { id: string; name: string } | null;
  budget: MonthlyBudget | null;
  expenses: Expense[];
  onSetBudget: (amount: number) => void;
  onAddExpense: (input: { amount: number; category: string; label: string | null; expenseDate: string }) => void;
}

export function BudgetPane({ myId, myName, partner, budget, expenses, onSetBudget, onAddExpense }: BudgetPaneProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('courses');
  const [label, setLabel] = useState('');

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const hasBudget = !!budget && budget.amount > 0;
  const progress = hasBudget ? budgetProgress(spent, budget!.amount) : null;

  const mySpent = expenses.filter((e) => e.paidBy === myId).reduce((s, e) => s + e.amount, 0);
  const partnerSpent = partner ? expenses.filter((e) => e.paidBy === partner.id).reduce((s, e) => s + e.amount, 0) : 0;

  function handleEditBudget() {
    const value = window.prompt('Budget du mois (€)', budget ? String(budget.amount) : '');
    if (value === null) return;
    const parsed = parseFloat(value.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed >= 0) onSetBudget(parsed);
  }

  function handleAddExpense() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) return;
    onAddExpense({ amount: parsed, category, label: label.trim() || null, expenseDate: todayKey() });
    setAmount('');
    setLabel('');
    setAddOpen(false);
  }

  return (
    <section className="pane on">
      <div className="glass bud">
        <div className="hd">
          <span>BUDGET {MONTH_LABEL}</span>
          <span className="edit" onClick={handleEditBudget}>
            Modifier
          </span>
        </div>
        <div className="rest">
          <span style={{ color: progress?.overspent ? 'var(--red)' : 'var(--text)' }}>
            {hasBudget ? eur(progress!.remaining) : '–'}
          </span>
          <small>€ restants</small>
        </div>
        <div className="sub">
          {hasBudget
            ? `${eur(spent)} € dépensés sur ${eur(budget!.amount)} € · ${Math.round(progress!.pct)}%`
            : 'Aucun budget défini pour ce mois-ci'}
        </div>
        <div className="track">
          <i style={{ width: `${progress?.pct ?? 0}%`, background: progress ? BUDGET_ZONE_HEX[progress.zone] : undefined }} />
        </div>
        <div className="ends">
          <span>{eur(spent)} € dépensés</span>
          <span>{hasBudget ? `${eur(budget!.amount)} €` : '–'}</span>
        </div>
      </div>

      <div className="who2">
        <div className="glass whocard">
          <div className="n">
            <span className="av" style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand-2))' }}>
              {myName?.[0]?.toUpperCase() ?? '?'}
            </span>
            {myName ?? 'Moi'}
          </div>
          <div className="amt">{eur(mySpent)} €</div>
        </div>
        <div className="glass whocard">
          <div className="n">
            <span className="av" style={{ background: 'linear-gradient(135deg,var(--her),var(--her-2))' }}>
              {partner?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
            {partner?.name ?? '…'}
          </div>
          <div className="amt">{eur(partnerSpent)} €</div>
        </div>
      </div>

      <div className="lbl">
        <span>DÉPENSES DU MOIS</span>
        <span>{expenses.length} entrée{expenses.length > 1 ? 's' : ''}</span>
      </div>

      {!addOpen ? (
        <button type="button" className="dashed-row" onClick={() => setAddOpen(true)}>
          + Ajouter une dépense
        </button>
      ) : (
        <div className="field-card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant €"
              className="plain-input"
              style={{ flex: 1 }}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="plain-input" style={{ width: 130, fontSize: 12 }}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé (optionnel)"
            className="plain-input"
            style={{ marginTop: 8, width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={handleAddExpense}
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
        {expenses.length === 0 && <div className="empty">Aucune dépense ce mois-ci</div>}
        {expenses.map((e) => {
          const payerName = e.paidBy === myId ? (myName ?? 'Moi') : e.paidBy === partner?.id ? partner.name : '…';
          const payerGrad = e.paidBy === myId ? 'linear-gradient(135deg,var(--brand),var(--brand-2))' : 'linear-gradient(135deg,var(--her),var(--her-2))';
          const date = new Date(e.expenseDate);
          return (
            <div key={e.id} className="exp">
              <div className="cat">{CATEGORY_ICON[e.category] ?? '💳'}</div>
              <div className="mid">
                <b>{e.label ?? CATEGORY_LABEL[e.category as ExpenseCategory] ?? e.category}</b>
                <span>
                  <span className="dot" style={{ background: payerGrad }}>
                    {payerName[0]?.toUpperCase()}
                  </span>
                  {payerName} · {date.getDate()}/{date.getMonth() + 1} · {CATEGORY_LABEL[e.category as ExpenseCategory] ?? e.category}
                </span>
              </div>
              <div className="amt">{eur(e.amount)} €</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
