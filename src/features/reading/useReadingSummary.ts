import { useQuery } from '@tanstack/react-query';
import { getCurrentBook, listPositions } from '../../api/reading';
import { turnState } from '../../domain/reading';
import { useAuth } from '../../app/useAuth';

export function useReadingSummary() {
  const { session } = useAuth();
  const myId = session?.user.id ?? null;

  const bookQuery = useQuery({ queryKey: ['reading-book'], queryFn: getCurrentBook });
  const book = bookQuery.data ?? null;
  const bookId = book?.id ?? null;

  const positionsQuery = useQuery({ queryKey: ['reading-positions', bookId], queryFn: () => listPositions(bookId!), enabled: !!bookId });
  const positions = positionsQuery.data ?? [];

  const isLoading = bookQuery.isLoading || (!!bookId && positionsQuery.isLoading);

  if (isLoading) return { subtitle: '…' };
  if (!book) return { subtitle: 'Choisissez un livre à lire ensemble' };

  const myPos = positions.find((p) => p.userId === myId)?.lastChapter ?? 0;
  const theirPos = positions.find((p) => p.userId !== myId)?.lastChapter ?? 0;
  const turn = turnState(myPos, theirPos);

  const subtitle =
    turn === 'tied'
      ? `À égalité · chapitre ${myPos}/${book.totalChapters}`
      : turn === 'my_turn'
        ? `C'est ton tour · ch. ${myPos}/${book.totalChapters}`
        : `Au tour de l'autre · ch. ${myPos}/${book.totalChapters}`;

  return { subtitle };
}
