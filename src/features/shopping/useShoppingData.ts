import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProfileName, getPartnerProfile } from '../../api/profile';
import { getBudget, setBudget, subscribeToBudget } from '../../api/budget';
import { addExpense, listExpenses, subscribeToExpenses } from '../../api/expenses';
import { addShoppingItem, clearCheckedItems, listShoppingItems, subscribeToShopping, toggleShoppingItem } from '../../api/shopping';
import { addInventoryItem, adjustInventoryQuantity, listInventory, subscribeToInventory } from '../../api/inventory';
import { useAuth } from '../../app/useAuth';
import { yearMonthKey } from '../../lib/date';

export function useShoppingData() {
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const yearMonth = yearMonthKey();
  const queryClient = useQueryClient();

  const myProfileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfileName });
  const partnerQuery = useQuery({ queryKey: ['chat-partner'], queryFn: getPartnerProfile });
  const budgetQuery = useQuery({ queryKey: ['budget', yearMonth], queryFn: () => getBudget(yearMonth) });
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: listExpenses });
  const shoppingQuery = useQuery({ queryKey: ['shopping-items'], queryFn: listShoppingItems });
  const inventoryQuery = useQuery({ queryKey: ['inventory-items'], queryFn: listInventory });

  useEffect(() => subscribeToBudget(() => queryClient.invalidateQueries({ queryKey: ['budget'] })), [queryClient]);
  useEffect(() => subscribeToExpenses(() => queryClient.invalidateQueries({ queryKey: ['expenses'] })), [queryClient]);
  useEffect(() => subscribeToShopping(() => queryClient.invalidateQueries({ queryKey: ['shopping-items'] })), [queryClient]);
  useEffect(() => subscribeToInventory(() => queryClient.invalidateQueries({ queryKey: ['inventory-items'] })), [queryClient]);

  const setBudgetMutation = useMutation({
    mutationFn: (amount: number) => setBudget(yearMonth, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  });

  const addExpenseMutation = useMutation({
    mutationFn: addExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ label, qty }: { label: string; qty: string | null }) => addShoppingItem(label, qty),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-items'] }),
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) => toggleShoppingItem(id, checked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-items'] }),
  });

  const clearCheckedMutation = useMutation({
    mutationFn: clearCheckedItems,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-items'] }),
  });

  const addInventoryMutation = useMutation({
    mutationFn: addInventoryItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
  });

  const adjustInventoryMutation = useMutation({
    mutationFn: ({ id, currentQuantity, delta }: { id: string; currentQuantity: number; delta: number }) =>
      adjustInventoryQuantity(id, currentQuantity, delta),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
  });

  return {
    myId,
    myName: myProfileQuery.data ?? null,
    partner: partnerQuery.data ?? null,
    yearMonth,
    budget: budgetQuery.data ?? null,
    setBudget: setBudgetMutation.mutate,
    expenses: expensesQuery.data ?? [],
    addExpense: addExpenseMutation.mutate,
    shoppingItems: shoppingQuery.data ?? [],
    addShoppingItem: (label: string, qty: string | null = null) => addItemMutation.mutate({ label, qty }),
    toggleShoppingItem: (id: string, checked: boolean) => toggleItemMutation.mutate({ id, checked }),
    clearCheckedItems: () => clearCheckedMutation.mutate(),
    inventoryItems: inventoryQuery.data ?? [],
    addInventoryItem: addInventoryMutation.mutate,
    adjustInventoryQuantity: (id: string, currentQuantity: number, delta: number) =>
      adjustInventoryMutation.mutate({ id, currentQuantity, delta }),
    isLoading: budgetQuery.isLoading || expensesQuery.isLoading || shoppingQuery.isLoading || inventoryQuery.isLoading,
  };
}
