import type { InventoryItem, StockStatus } from './types';

export function stockStatus(item: { quantity: number; minQty: number }): StockStatus {
  if (item.quantity === 0) return 'epuise';
  if (item.quantity <= item.minQty) return 'bas';
  return 'ok';
}

export function lowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((i) => stockStatus(i) !== 'ok');
}
