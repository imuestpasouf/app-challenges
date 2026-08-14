import type { ComparisonOp, MilestoneStatus } from './types';

function compare(value: number, op: ComparisonOp, target: number): boolean {
  switch (op) {
    case 'lte':
      return value <= target;
    case 'gte':
      return value >= target;
    case 'eq':
      return value === target;
    case 'lt':
      return value < target;
    case 'gt':
      return value > target;
  }
}

interface EvaluateMilestoneInput {
  entryValue: number;
  entryDate: string;
  targetValue: number;
  comparison: ComparisonOp;
  targetDate: string;
  currentStatus: MilestoneStatus;
  today: Date;
}

interface EvaluateMilestoneResult {
  status: MilestoneStatus;
  validatedAt: string | null;
}

/**
 * Évalue un milestone à chaque nouvelle entry (§6.4).
 * - Condition satisfaite avant l'échéance -> valide.
 * - Échéance dépassée sans validation -> manque.
 * - Sinon, on ne change rien (en_attente).
 */
export function evaluateMilestone(input: EvaluateMilestoneInput): EvaluateMilestoneResult {
  const { entryValue, entryDate, targetValue, comparison, targetDate, currentStatus, today } = input;

  if (currentStatus === 'valide') {
    return { status: 'valide', validatedAt: null };
  }

  const entryDateObj = new Date(entryDate);
  const targetDateObj = new Date(targetDate);

  if (entryDateObj <= targetDateObj && compare(entryValue, comparison, targetValue)) {
    return { status: 'valide', validatedAt: new Date().toISOString() };
  }

  if (today > targetDateObj) {
    return { status: 'manque', validatedAt: null };
  }

  return { status: 'en_attente', validatedAt: null };
}
