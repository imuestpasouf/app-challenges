export type ChallengeStatus = 'actif' | 'termine' | 'abandonne';
export type FieldType = 'number' | 'text' | 'boolean' | 'duration';
export type MilestoneStatus = 'en_attente' | 'valide' | 'manque';
export type ComparisonOp = 'lte' | 'gte' | 'eq' | 'lt' | 'gt';

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export interface Challenge {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  createdAt: string;
}

export interface ChallengeField {
  id: string;
  challengeId: string;
  label: string;
  fieldType: FieldType;
  unit: string | null;
  isRequired: boolean;
  displayOrder: number;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  fieldId: string;
  entryDate: string;
  value: string | null;
  createdAt: string;
}

export interface ChallengeMilestone {
  id: string;
  challengeId: string;
  fieldId: string;
  title: string;
  targetDate: string;
  targetValue: number;
  comparison: ComparisonOp;
  status: MilestoneStatus;
  validatedAt: string | null;
}

export interface Note {
  id: string;
  ownerId: string;
  challengeId: string | null;
  content: string | null;
  youtubeUrl: string | null;
  createdAt: string;
}

export interface PlanningEvent {
  id: string;
  createdBy: string | null;
  title: string;
  startAt: string;
  endAt: string;
  note: string | null;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  label: string;
  checked: boolean;
  addedBy: string | null;
  createdAt: string;
  qty: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  paidBy: string | null;
  note: string | null;
  expenseDate: string;
  createdAt: string;
  label: string | null;
}

export interface MonthlyBudget {
  id: string;
  yearMonth: string;
  amount: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  label: string;
  icon: string | null;
  quantity: number;
  unit: string | null;
  minQty: number;
  updatedBy: string | null;
  updatedAt: string;
}

export type StockStatus = 'epuise' | 'bas' | 'ok';

export type ReadingStatus = 'en_cours' | 'termine' | 'abandonne';

export interface Book {
  id: string;
  title: string;
  author: string | null;
  coverEmoji: string;
  totalChapters: number;
  status: ReadingStatus;
  startedAt: string;
  finishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ReadingPosition {
  id: string;
  bookId: string;
  userId: string;
  lastChapter: number;
  updatedAt: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  userId: string;
  fromChapter: number;
  toChapter: number;
  readAt: string;
}

export interface ChapterComment {
  id: string;
  bookId: string;
  chapter: number;
  authorId: string;
  content: string;
  sealed: boolean;
  createdAt: string;
}

export interface ChapterQuote {
  id: string;
  bookId: string;
  chapter: number;
  authorId: string;
  content: string;
  page: number | null;
  sealed: boolean;
  createdAt: string;
}

export interface ChapterRating {
  id: string;
  bookId: string;
  chapter: number;
  userId: string;
  rating: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string | null;
  imagePath: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}
