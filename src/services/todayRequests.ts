// =============================================================================
// TODAY REQUESTS — the habit page asking Today to open the detailed check-in.
//
// Press and hold on a Today row opens the habit's page. Its "Log with details"
// button doesn't log there: it hands the habit back to Today and goes back, so
// every check-in still runs through Today's one completion path (XP, streak,
// toast or celebration, the note offer). Same in-memory pattern as the
// mini-app finish handoff in services/miniApps.ts — it lives for one
// navigation, and losing it in a crash costs only the prompt.
// =============================================================================

export interface DetailedLogRequest {
  habitId: string;
}

let pending: DetailedLogRequest | null = null;

export const requestDetailedLog = (request: DetailedLogRequest): void => {
  pending = request;
};

/** Read and clear. Today calls this on focus. */
export const takeDetailedLogRequest = (): DetailedLogRequest | null => {
  const request = pending;
  pending = null;
  return request;
};
