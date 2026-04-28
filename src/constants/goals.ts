import { GoalStatus } from '../types';

export const GOAL_CONSTANTS = {
  MAX_ACTIVE: 3,
  NAME_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 300,
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  not_completed: 'Not Completed',
  archived: 'Archived',
};
