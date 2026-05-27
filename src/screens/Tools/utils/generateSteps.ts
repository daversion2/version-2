import { WorksheetTemplate, WorksheetSection, WorksheetField } from '../../../types';

export type StepType =
  | 'intro'
  | 'mood_before'
  | 'section_intro'
  | 'field'
  | 'goal_link'
  | 'mood_after'
  | 'completion';

export interface ToolStep {
  type: StepType;
  id: string;
  section?: WorksheetSection;
  field?: WorksheetField;
  sectionIndex?: number;
}

export function generateStepsFromTemplate(template: WorksheetTemplate): ToolStep[] {
  const steps: ToolStep[] = [
    { type: 'intro', id: 'intro' },
    { type: 'mood_before', id: 'mood_before' },
  ];

  template.sections.forEach((section, sectionIdx) => {
    steps.push({
      type: 'section_intro',
      id: `section_intro_${section.id}`,
      section,
      sectionIndex: sectionIdx,
    });

    section.fields.forEach((field) => {
      steps.push({
        type: 'field',
        id: `field_${field.id}`,
        field,
        section,
        sectionIndex: sectionIdx,
      });
    });
  });

  steps.push({ type: 'goal_link', id: 'goal_link' });
  steps.push({ type: 'mood_after', id: 'mood_after' });
  steps.push({ type: 'completion', id: 'completion' });

  return steps;
}

/**
 * Calculate the step index to resume from when loading a draft.
 * Finds the first required field that is empty.
 */
export function calculateResumeStepIndex(
  steps: ToolStep[],
  responses: Record<string, string | string[]>,
  moodBefore?: number
): number {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type === 'mood_before' && !moodBefore) return i;
    if (step.type === 'field' && step.field?.required) {
      const val = responses[step.field.id];
      if (!val || (Array.isArray(val) && val.length === 0) || val === '') {
        // Go back to section_intro if it's the first field in section
        if (i > 0 && steps[i - 1].type === 'section_intro') {
          return i - 1;
        }
        return i;
      }
    }
  }
  // All filled — go to mood_after
  const moodAfterIdx = steps.findIndex((s) => s.type === 'mood_after');
  return moodAfterIdx >= 0 ? moodAfterIdx : steps.length - 1;
}
