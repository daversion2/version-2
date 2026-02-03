// Core data models per spec

export interface User {
  id: string;
  email: string;
  created_at: string;
  has_completed_onboarding?: boolean;
  has_completed_walkthrough?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'archived';

export interface Challenge {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  date: string;
  difficulty_expected: number; // 1-5
  status: ChallengeStatus;
  difficulty_actual?: number; // 1-5
  points_awarded?: number;
  reflection_note?: string;
  reflection_hardest_moment?: string;
  reflection_push_through?: string;
  reflection_next_time?: string;
  created_at: string;
  completed_at?: string;
  description?: string;
  success_criteria?: string;
  why?: string;
  deadline?: string; // ISO 8601 timestamp, optional
}

export interface Nudge {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  is_active: boolean;
  created_by_user: boolean;
  target_count_per_week: number; // 1–7
}

export interface CompletionLog {
  id: string;
  user_id: string;
  type: 'challenge' | 'nudge';
  reference_id: string;
  points: number;
  difficulty: number;
  date: string;
  completed_at?: string; // ISO 8601 timestamp
}

export type HabitDifficulty = 'easy' | 'challenging';

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Physical', color: '#217180' },
  { name: 'Mental', color: '#FF5B02' },
  { name: 'Social', color: '#2B2B2B' },
  { name: 'Professional', color: '#656565' },
  { name: 'Creative', color: '#217180' },
];
