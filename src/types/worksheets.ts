// ============================================================================
// CBT WORKSHEETS
// ============================================================================

export type WorksheetCategory = 'thoughts' | 'beliefs' | 'behavior';

export type WorksheetFieldType =
  | 'text'
  | 'textarea'
  | 'mood_scale'
  | 'checklist'
  | 'single_select';

export interface WorksheetField {
  id: string;
  label: string;
  placeholder?: string;
  field_type: WorksheetFieldType;
  required: boolean;
  options?: string[];
  helper_text?: string;
  max_length?: number;
}

export interface WorksheetSection {
  id: string;
  title: string;
  description?: string;
  fields: WorksheetField[];
}

export interface WorksheetTemplate {
  id: string;
  name: string;
  short_description: string;
  long_description: string;
  category: WorksheetCategory;
  difficulty: number;           // 1-3
  estimated_minutes: number;
  icon: string;                 // Ionicons name
  color: string;                // Accent color
  sections: WorksheetSection[];
  tips?: string[];
  when_to_use: string;
}

export interface WorksheetEntry {
  id: string;
  user_id: string;
  template_id: string;
  template_name: string;
  responses: Record<string, string | string[]>;
  mood_before?: number;         // 1-10
  mood_after?: number;          // 1-10
  points_awarded?: number;
  goal_ids?: string[];
  is_draft: boolean;
  created_at: string;
  completed_at?: string;
}
