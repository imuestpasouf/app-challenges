import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { nextPosition, ratingsRevealed, turnState } from '../domain/reading';
import type { Book, ChapterComment, ChapterQuote, ChapterRating, ReadingPosition } from '../domain/types';

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  cover_emoji: string;
  total_chapters: number;
  status: Book['status'];
  started_at: string;
  finished_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface ReadingPositionRow {
  id: string;
  book_id: string;
  user_id: string;
  last_chapter: number;
  updated_at: string;
}

interface ChapterCommentRow {
  id: string;
  book_id: string;
  chapter: number;
  author_id: string;
  content: string;
  sealed: boolean;
  created_at: string;
}

interface ChapterQuoteRow {
  id: string;
  book_id: string;
  chapter: number;
  author_id: string;
  content: string;
  page: number | null;
  sealed: boolean;
  created_at: string;
}

interface ChapterRatingRow {
  id: string;
  book_id: string;
  chapter: number;
  user_id: string;
  rating: number;
  created_at: string;
}

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverEmoji: row.cover_emoji,
    totalChapters: row.total_chapters,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toPosition(row: ReadingPositionRow): ReadingPosition {
  return {
    id: row.id,
    bookId: row.book_id,
    userId: row.user_id,
    lastChapter: row.last_chapter,
    updatedAt: row.updated_at,
  };
}

function toComment(row: ChapterCommentRow): ChapterComment {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    authorId: row.author_id,
    content: row.content,
    sealed: row.sealed,
    createdAt: row.created_at,
  };
}

function toQuote(row: ChapterQuoteRow): ChapterQuote {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    authorId: row.author_id,
    content: row.content,
    page: row.page,
    sealed: row.sealed,
    createdAt: row.created_at,
  };
}

function toRating(row: ChapterRatingRow): ChapterRating {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    userId: row.user_id,
    rating: row.rating,
    createdAt: row.created_at,
  };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function getCurrentBook(): Promise<Book | null> {
  const { data, error } = await supabase.from('books').select('*').eq('status', 'en_cours').order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? toBook(data as BookRow) : null;
}

export async function createBook(input: { title: string; author: string | null; coverEmoji: string; totalChapters: number }): Promise<Book> {
  const createdBy = await currentUserId();
  const { data, error } = await supabase
    .from('books')
    .insert({ title: input.title, author: input.author, cover_emoji: input.coverEmoji, total_chapters: input.totalChapters, created_by: createdBy })
    .select('*')
    .single();
  if (error) throw error;
  return toBook(data as BookRow);
}

export async function finishBook(id: string): Promise<void> {
  const { error } = await supabase.from('books').update({ status: 'termine', finished_at: new Date().toISOString().slice(0, 10) }).eq('id', id);
  if (error) throw error;
}

export async function listPositions(bookId: string): Promise<ReadingPosition[]> {
  const { data, error } = await supabase.from('reading_positions').select('*').eq('book_id', bookId);
  if (error) throw error;
  return (data as ReadingPositionRow[]).map(toPosition);
}

export async function listComments(bookId: string): Promise<ChapterComment[]> {
  const { data, error } = await supabase.from('chapter_comments').select('*').eq('book_id', bookId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ChapterCommentRow[]).map(toComment);
}

export async function listQuotes(bookId: string): Promise<ChapterQuote[]> {
  const { data, error } = await supabase.from('chapter_quotes').select('*').eq('book_id', bookId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ChapterQuoteRow[]).map(toQuote);
}

export async function listRatings(bookId: string): Promise<ChapterRating[]> {
  const { data, error } = await supabase.from('chapter_ratings').select('*').eq('book_id', bookId);
  if (error) throw error;
  return (data as ChapterRatingRow[]).map(toRating);
}

export async function advancePosition(
  bookId: string,
  bookTitle: string,
  from: number,
  to: number,
  partner: { id: string; name: string } | null
): Promise<void> {
  const myId = await currentUserId();

  const { data: existing, error: fetchError } = await supabase
    .from('reading_positions')
    .select('*')
    .eq('book_id', bookId)
    .eq('user_id', myId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const before = existing ? (existing as ReadingPositionRow).last_chapter : 0;
  const after = nextPosition(before, to);

  const { error: upsertError } = await supabase
    .from('reading_positions')
    .upsert({ book_id: bookId, user_id: myId, last_chapter: after, updated_at: new Date().toISOString() }, { onConflict: 'book_id,user_id' });
  if (upsertError) throw upsertError;

  const { error: sessionError } = await supabase.from('reading_sessions').insert({ book_id: bookId, user_id: myId, from_chapter: from, to_chapter: to });
  if (sessionError) throw sessionError;

  if (partner) {
    const { data: partnerPos } = await supabase
      .from('reading_positions')
      .select('last_chapter')
      .eq('book_id', bookId)
      .eq('user_id', partner.id)
      .maybeSingle();
    const partnerChapter = (partnerPos as { last_chapter: number } | null)?.last_chapter ?? 0;
    const wasTheirTurn = turnState(before, partnerChapter) === 'their_turn';
    const isTheirTurn = turnState(after, partnerChapter) === 'their_turn';
    if (isTheirTurn && !wasTheirTurn) {
      void notifyYourTurn(partner.id, partner.name, bookTitle, after);
    }
  }
}

export async function addComment(
  bookId: string,
  chapter: number,
  content: string,
  sealed: boolean,
  fromName: string,
  partner: { id: string; name: string } | null
): Promise<ChapterComment> {
  const authorId = await currentUserId();
  const { data, error } = await supabase
    .from('chapter_comments')
    .insert({ book_id: bookId, chapter, author_id: authorId, content, sealed })
    .select('*')
    .single();
  if (error) throw error;

  // Ne jamais notifier la création d'un commentaire scellé : ce serait un spoiler d'existence.
  if (!sealed && partner) void notifyComment(partner.id, fromName, chapter);

  return toComment(data as ChapterCommentRow);
}

export async function addQuote(bookId: string, chapter: number, content: string, page: number | null, sealed: boolean): Promise<ChapterQuote> {
  const authorId = await currentUserId();
  const { data, error } = await supabase
    .from('chapter_quotes')
    .insert({ book_id: bookId, chapter, author_id: authorId, content, page, sealed })
    .select('*')
    .single();
  if (error) throw error;
  return toQuote(data as ChapterQuoteRow);
}

export async function setRating(bookId: string, chapter: number, rating: number, myPos: number, partner: { id: string; name: string } | null): Promise<ChapterRating> {
  const userId = await currentUserId();

  const { data: mine } = await supabase.from('chapter_ratings').select('*').eq('book_id', bookId).eq('chapter', chapter).eq('user_id', userId).maybeSingle();
  const isFirstRating = !mine;

  const { data, error } = await supabase
    .from('chapter_ratings')
    .upsert({ book_id: bookId, chapter, user_id: userId, rating }, { onConflict: 'book_id,chapter,user_id' })
    .select('*')
    .single();
  if (error) throw error;

  if (isFirstRating && partner) {
    const { data: partnerRating } = await supabase
      .from('chapter_ratings')
      .select('*')
      .eq('book_id', bookId)
      .eq('chapter', chapter)
      .eq('user_id', partner.id)
      .maybeSingle();
    const { data: partnerPos } = await supabase
      .from('reading_positions')
      .select('last_chapter')
      .eq('book_id', bookId)
      .eq('user_id', partner.id)
      .maybeSingle();
    const partnerChapter = (partnerPos as { last_chapter: number } | null)?.last_chapter ?? 0;
    if (ratingsRevealed(chapter, myPos, partnerChapter, toRating(data as ChapterRatingRow), partnerRating as ChapterRating | undefined)) {
      void notifyRatingsRevealed(partner.id, chapter);
    }
  }

  return toRating(data as ChapterRatingRow);
}

export async function notifyYourTurn(toUserId: string, fromName: string, bookTitle: string, chapter: number): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: { toUserId, kind: 'shared', title: fromName, body: `C'est ton tour de lire « ${bookTitle} » — chapitre ${chapter}`, url: '/reading' },
    });
  } catch {
    // best-effort
  }
}

export async function notifyComment(toUserId: string, fromName: string, chapter: number): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: { toUserId, kind: 'shared', title: fromName, body: `A commenté le chapitre ${chapter}`, url: '/reading' },
    });
  } catch {
    // best-effort
  }
}

export async function notifyRatingsRevealed(toUserId: string, chapter: number): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', {
      body: { toUserId, kind: 'shared', title: 'Notes révélées', body: `Vos notes du chapitre ${chapter} sont révélées`, url: '/reading' },
    });
  } catch {
    // best-effort
  }
}

type BooksChangeHandler = (payload: RealtimePostgresChangesPayload<BookRow>) => void;
type PositionsChangeHandler = (payload: RealtimePostgresChangesPayload<ReadingPositionRow>) => void;
type CommentsChangeHandler = (payload: RealtimePostgresChangesPayload<ChapterCommentRow>) => void;
type QuotesChangeHandler = (payload: RealtimePostgresChangesPayload<ChapterQuoteRow>) => void;
type RatingsChangeHandler = (payload: RealtimePostgresChangesPayload<ChapterRatingRow>) => void;

export function subscribeToReading(handlers: {
  onBooksChange: BooksChangeHandler;
  onPositionsChange: PositionsChangeHandler;
  onCommentsChange: CommentsChangeHandler;
  onQuotesChange: QuotesChangeHandler;
  onRatingsChange: RatingsChangeHandler;
}) {
  const channel = supabase
    .channel('reading-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, handlers.onBooksChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reading_positions' }, handlers.onPositionsChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chapter_comments' }, handlers.onCommentsChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chapter_quotes' }, handlers.onQuotesChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chapter_ratings' }, handlers.onRatingsChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
