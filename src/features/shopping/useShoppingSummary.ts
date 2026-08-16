import { useQuery } from '@tanstack/react-query';
import { getBudget } from '../../api/budget';
import { listExpenses } from '../../api/expenses';
import { listShoppingItems } from '../../api/shopping';
import { listInventory } from '../../api/inventory';
import { stockStatus } from '../../domain/inventory';
import { yearMonthKey } from '../../lib/date';
import { eur } from './constants';

export function useShoppingSummary() {
  const yearMonth = yearMonthKey();
  const budgetQuery = useQuery({ queryKey: ['budget', yearMonth], queryFn: () => getBudget(yearMonth) });
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: listExpenses });
  const shoppingQuery = useQuery({ queryKey: ['shopping-items'], queryFn: listShoppingItems });
  const inventoryQuery = useQuery({ queryKey: ['inventory-items'], queryFn: listInventory });

  const todoCount = (shoppingQuery.data ?? []).filter((i) => !i.checked).length;
  const lowCount = (inventoryQuery.data ?? []).filter((i) => stockStatus(i) !== 'ok').length;
  const spent = (expensesQuery.data ?? []).reduce((s, e) => s + e.amount, 0);
  const budget = budgetQuery.data;

  const isLoading = budgetQuery.isLoading || expensesQuery.isLoading || shoppingQuery.isLoading || inventoryQuery.isLoading;

  const bits = [`${todoCount} article${todoCount > 1 ? 's' : ''} à acheter`];
  if (lowCount > 0) bits.push(`${lowCount} à racheter`);
  if (budget) bits.push(`${eur(budget.amount - spent)} € restants`);

  return { subtitle: isLoading ? '…' : bits.join(' · ') };
}
