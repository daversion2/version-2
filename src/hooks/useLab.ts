import { useAuth } from '../context/AuthContext';
import { isLabExperimentOn } from '../services/lab';
import type { LabExperimentId } from '../screens/Lab/experiments';

/**
 * Is this Lab experiment switched on for the signed-in account? Always false
 * for anyone without is_admin, so `useLab('x') ? <New /> : <Current />` keeps
 * every real user on the current version. See screens/Lab/experiments.ts.
 *
 * Type-only import of the registry: reading a switch never loads Lab code.
 */
export const useLab = (id: LabExperimentId): boolean => {
  const { userProfile } = useAuth();
  return isLabExperimentOn(userProfile, id);
};
