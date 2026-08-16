import { describe, expect, it } from 'vitest';
import { lowStockItems, stockStatus } from './inventory';
import type { InventoryItem } from './types';

function item(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: '1',
    label: 'Riz',
    icon: null,
    quantity: 3,
    unit: 'kg',
    minQty: 1,
    updatedBy: null,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('stockStatus', () => {
  it('is epuise at zero quantity', () => {
    expect(stockStatus({ quantity: 0, minQty: 2 })).toBe('epuise');
  });

  it('is bas at or below the minimum threshold', () => {
    expect(stockStatus({ quantity: 1, minQty: 2 })).toBe('bas');
    expect(stockStatus({ quantity: 2, minQty: 2 })).toBe('bas');
  });

  it('is ok above the minimum threshold', () => {
    expect(stockStatus({ quantity: 3, minQty: 2 })).toBe('ok');
  });
});

describe('lowStockItems', () => {
  it('keeps only epuise and bas items', () => {
    const items = [
      item({ id: 'a', quantity: 0, minQty: 1 }),
      item({ id: 'b', quantity: 1, minQty: 1 }),
      item({ id: 'c', quantity: 5, minQty: 1 }),
    ];
    expect(lowStockItems(items).map((i) => i.id)).toEqual(['a', 'b']);
  });
});
