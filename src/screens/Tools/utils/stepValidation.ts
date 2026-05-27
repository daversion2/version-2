import { ToolStep } from './generateSteps';

/**
 * Determines whether the current step has enough data to proceed.
 * Used to enable/disable the Continue button.
 */
export function isStepComplete(
  step: ToolStep,
  responses: Record<string, string | string[]>,
  moodBefore?: number,
  moodAfter?: number
): boolean {
  switch (step.type) {
    case 'intro':
    case 'section_intro':
    case 'goal_link':
    case 'completion':
      return true;

    case 'mood_before':
      return moodBefore !== undefined;

    case 'mood_after':
      return moodAfter !== undefined;

    case 'field': {
      if (!step.field) return true;
      if (!step.field.required) return true;
      const val = responses[step.field.id];
      if (!val) return false;
      if (Array.isArray(val)) return val.length > 0;
      return val.trim().length > 0;
    }

    default:
      return true;
  }
}
