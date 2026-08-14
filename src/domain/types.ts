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
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  paidBy: string | null;
  note: string | null;
  expenseDate: string;
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
