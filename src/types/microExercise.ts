import { MicroExerciseTrigger } from './worksheets';

export interface MicroExerciseQuestion {
  id: string;
  prompt: string;
  placeholder: string;
}

export interface MicroExerciseDefinition {
  feeling_key: string;
  feeling_label: string;
  source_template_id: string; // maps to existing WORKSHEET_TEMPLATES[].id
  default_for_triggers: MicroExerciseTrigger[];
  questions: [MicroExerciseQuestion, MicroExerciseQuestion, MicroExerciseQuestion];
  completion_affirmation: string;
}

export interface MicroExerciseSessionState {
  trigger_context: MicroExerciseTrigger;
  feeling_key: string;
  feeling_label: string;
  source_template_id: string;
  responses: Record<string, string>; // keyed by question.id
  micro_commitment: string;
  entry_id?: string; // populated after Firestore save
}

export type MicroExerciseParamList = {
  MicroExerciseFeeling: {
    trigger_context: MicroExerciseTrigger;
  };
  MicroExerciseQuestion: {
    session: MicroExerciseSessionState;
    question_index: 0 | 1 | 2;
    exercise: MicroExerciseDefinition;
  };
  MicroExerciseCommitment: {
    session: MicroExerciseSessionState;
    exercise: MicroExerciseDefinition;
  };
  MicroExerciseComplete: {
    session: MicroExerciseSessionState;
    exercise: MicroExerciseDefinition;
    pointsAwarded: number;
  };
  MicroExerciseFollowUp: {
    entry_id: string;
    user_id: string;
  };
};
