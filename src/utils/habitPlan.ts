import { HabitActionPlan } from '../types';

/**
 * One-line recap of a habit's "obvious + attractive" setup for inline display:
 * the anchor (habit-stacking cue) and the pairing (temptation bundle), e.g.
 * "After I have my morning coffee · with a podcast".
 *
 * Falls back to the legacy free-text `cue` when a habit predates the structured
 * anchor field (which reads as a full sentence, so it isn't prefixed with "After I").
 */
export const formatHabitPlanLine = (plan?: HabitActionPlan): string => {
  if (!plan) return '';
  const parts: string[] = [];
  if (plan.anchor) parts.push(`After I ${plan.anchor}`);
  else if (plan.cue) parts.push(plan.cue);
  if (plan.pairing) parts.push(`with ${plan.pairing}`);
  return parts.join(' · ');
};
