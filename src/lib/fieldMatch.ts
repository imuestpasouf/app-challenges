import type { ChallengeField } from '../domain/types';

function normalize(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function findEatenField(fields: ChallengeField[]): ChallengeField | null {
  return fields.find((f) => /inger|mange|eat/.test(normalize(f.label))) ?? null;
}

export function findBurnedField(fields: ChallengeField[]): ChallengeField | null {
  return fields.find((f) => /brul|burn/.test(normalize(f.label))) ?? null;
}
