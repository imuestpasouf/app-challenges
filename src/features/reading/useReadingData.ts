import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProfileName, getPartnerProfile } from '../../api/profile';
import {
  addComment,
  addQuote,
  advancePosition,
  createBook,
  finishBook,
  getCurrentBook,
  listComments,
  listPositions,
  listQuotes,
  listRatings,
  setRating,
  subscribeToReading,
} from '../../api/reading';
import { useAuth } from '../../app/useAuth';

export function useReadingData() {
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const myProfileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfileName });
  const partnerQuery = useQuery({ queryKey: ['chat-partner'], queryFn: getPartnerProfile });
  const partner = partnerQuery.data ?? null;

  const bookQuery = useQuery({ queryKey: ['reading-book'], queryFn: getCurrentBook });
  const book = bookQuery.data ?? null;
  const bookId = book?.id ?? null;

  const positionsQuery = useQuery({ queryKey: ['reading-positions', bookId], queryFn: () => listPositions(bookId!), enabled: !!bookId });
  const commentsQuery = useQuery({ queryKey: ['reading-comments', bookId], queryFn: () => listComments(bookId!), enabled: !!bookId });
  const quotesQuery = useQuery({ queryKey: ['reading-quotes', bookId], queryFn: () => listQuotes(bookId!), enabled: !!bookId });
  const ratingsQuery = useQuery({ queryKey: ['reading-ratings', bookId], queryFn: () => listRatings(bookId!), enabled: !!bookId });

  const positions = positionsQuery.data ?? [];
  const myPos = positions.find((p) => p.userId === myId)?.lastChapter ?? 0;
  const theirPos = partner ? (positions.find((p) => p.userId === partner.id)?.lastChapter ?? 0) : 0;

  useEffect(
    () =>
      subscribeToReading({
        onBooksChange: () => queryClient.invalidateQueries({ queryKey: ['reading-book'] }),
        onPositionsChange: () => queryClient.invalidateQueries({ queryKey: ['reading-positions'] }),
        onCommentsChange: () => queryClient.invalidateQueries({ queryKey: ['reading-comments'] }),
        onQuotesChange: () => queryClient.invalidateQueries({ queryKey: ['reading-quotes'] }),
        onRatingsChange: () => queryClient.invalidateQueries({ queryKey: ['reading-ratings'] }),
      }),
    [queryClient]
  );

  const createBookMutation = useMutation({
    mutationFn: createBook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-book'] }),
  });

  const finishBookMutation = useMutation({
    mutationFn: finishBook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-book'] }),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ from, to }: { from: number; to: number }) => advancePosition(bookId!, book!.title, from, to, partner),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-positions'] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ chapter, content, sealed }: { chapter: number; content: string; sealed: boolean }) =>
      addComment(bookId!, chapter, content, sealed, myProfileQuery.data ?? 'Moi', partner),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-comments'] }),
  });

  const addQuoteMutation = useMutation({
    mutationFn: ({ chapter, content, page, sealed }: { chapter: number; content: string; page: number | null; sealed: boolean }) =>
      addQuote(bookId!, chapter, content, page, sealed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-quotes'] }),
  });

  const setRatingMutation = useMutation({
    mutationFn: ({ chapter, rating }: { chapter: number; rating: number }) => setRating(bookId!, chapter, rating, myPos, partner),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reading-ratings'] }),
  });

  return {
    myId,
    myName: myProfileQuery.data ?? null,
    partner,
    book,
    createBook: createBookMutation.mutate,
    finishBook: finishBookMutation.mutate,
    positions,
    myPos,
    theirPos,
    comments: commentsQuery.data ?? [],
    quotes: quotesQuery.data ?? [],
    ratings: ratingsQuery.data ?? [],
    advance: (from: number, to: number) => advanceMutation.mutateAsync({ from, to }),
    addComment: (chapter: number, content: string, sealed: boolean) => addCommentMutation.mutate({ chapter, content, sealed }),
    addQuote: (chapter: number, content: string, page: number | null, sealed: boolean) => addQuoteMutation.mutate({ chapter, content, page, sealed }),
    setRating: (chapter: number, rating: number) => setRatingMutation.mutate({ chapter, rating }),
    isLoading: bookQuery.isLoading || (!!bookId && (positionsQuery.isLoading || commentsQuery.isLoading || quotesQuery.isLoading || ratingsQuery.isLoading)),
  };
}
