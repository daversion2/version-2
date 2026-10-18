import type { ComposeRequest } from '../utils/meditation/compose';

/** The Compose mini-app's own stack (Lab). */
export type ComposeStackParamList = {
  ComposeHome: undefined;
  /** `prefill` = "Try again" or "Make another like this". */
  ComposeNew: { prefill?: Partial<ComposeRequest> } | undefined;
  ComposeSession: { id: string };
};
