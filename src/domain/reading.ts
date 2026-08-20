import type { ChapterRating } from './types';

export type ChapterState = 'both_read' | 'waiting_other' | 'not_read_by_me';
export type TurnState = 'my_turn' | 'their_turn' | 'tied';

interface SealableItem {
  chapter: number;
  sealed: boolean;
  authorId: string;
}

/** Un contenu scellé est-il masqué pour ce lecteur ? */
export function isHidden(item: SealableItem, viewerId: string, viewerPosition: number): boolean {
  if (!item.sealed) return false;
  if (item.authorId === viewerId) return false;
  return viewerPosition < item.chapter;
}

/** Les deux notes d'un chapitre sont-elles révélables ? */
export function ratingsRevealed(
  chapter: number,
  posA: number,
  posB: number,
  ratingA?: ChapterRating,
  ratingB?: ChapterRating
): boolean {
  return posA >= chapter && posB >= chapter && !!ratingA && !!ratingB;
}

/** État d'un chapitre pour l'affichage du badge */
export function chapterState(chapter: number, myPos: number, theirPos: number): ChapterState {
  if (myPos >= chapter && theirPos >= chapter) return 'both_read';
  if (myPos >= chapter) return 'waiting_other';
  return 'not_read_by_me';
}

/** À qui le tour ? */
export function turnState(myPos: number, theirPos: number): TurnState {
  if (myPos < theirPos) return 'my_turn';
  if (myPos > theirPos) return 'their_turn';
  return 'tied';
}

/** Validation d'une plage saisie */
export function validateRange(from: number, to: number, total: number): boolean {
  return from >= 1 && to >= from && to <= total;
}

/** Nouvelle position après enregistrement d'une plage (jamais régressive) */
export function nextPosition(current: number, to: number): number {
  return Math.max(current, to);
}

/** Nombre de contenus scellés de l'autre qui viennent de se débloquer entre 2 positions */
export function countUnlocked(items: SealableItem[], viewerId: string, positionBefore: number, positionAfter: number): number {
  return items.filter(
    (item) => item.sealed && item.authorId !== viewerId && item.chapter > positionBefore && item.chapter <= positionAfter
  ).length;
}
