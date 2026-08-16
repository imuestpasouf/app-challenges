import { describe, expect, it } from 'vitest';
import { budgetProgress } from './budget';

describe('budgetProgress', () => {
  it('is green under 60% spent', () => {
    const p = budgetProgress(59, 100);
    expect(p.zone).toBe('green');
    expect(p.pct).toBe(59);
    expect(p.remaining).toBe(41);
    expect(p.overspent).toBe(false);
  });

  it('is amber between 60% and 85% spent', () => {
    expect(budgetProgress(60, 100).zone).toBe('amber');
    expect(budgetProgress(84, 100).zone).toBe('amber');
  });

  it('is red at 85% spent or above', () => {
    expect(budgetProgress(85, 100).zone).toBe('red');
    expect(budgetProgress(120, 100).zone).toBe('red');
  });

  it('flags overspending and caps pct at 100', () => {
    const p = budgetProgress(150, 100);
    expect(p.overspent).toBe(true);
    expect(p.remaining).toBe(-50);
    expect(p.pct).toBe(100);
  });

  it('does not divide by zero when there is no budget set', () => {
    const p = budgetProgress(10, 0);
    expect(p.pct).toBe(0);
    expect(p.zone).toBe('green');
  });
});
