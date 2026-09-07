import React, { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { Colors } from '../../constants/theme';
import { PracticeCompletionInput } from '../../types';
import { getPractice, PRACTICE_GROUPS } from '../../data/practices';
import { PracticeCaptureFlow } from './PracticeCaptureFlow';
import { resolveTemplateFields } from '../../data/habitTemplates';

interface Props {
  visible: boolean;
  habitName: string;
  /** Catalog id, when this habit has a definition — drives tracking + the targeted reflection. */
  practiceId?: string;
  /**
   * Preset template id for a CUSTOM habit (data/habitTemplates.ts). Custom habits
   * have no catalog entry, so their template is resolved from this instead.
   */
  templateId?: string;
  /**
   * The amounts this user committed to, keyed by tracking-field key. The capture
   * sheet opens its commitment field on this rather than the catalog default, so
   * hitting your own promise is one tap and falling short is a deliberate drag.
   */
  metricGoals?: Record<string, number>;
  /**
   * Collapse the capture questions onto one screen rather than stepping through
   * them. Set by every current caller — the stepped variant survives only for
   * the guided session flow, which nothing reaches today.
   */
  logOnly?: boolean;
  /**
   * Day to open the capture on (YYYY-MM-DD). Defaults to today. On the
   * `logOnly` path the user can still change it unless `lockDate` is set.
   */
  initialDate?: string;
  /** File the rep under `initialDate` with no day selector. */
  lockDate?: boolean;
  onSubmit: (input: PracticeCompletionInput) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * The "Log it" flow for a practice — a full-screen modal wrapping
 * <PracticeCaptureFlow>.
 *
 * There used to be a countdown phase in front of this for meditation and
 * breathwork. It is gone: an in-app timer needs the app foregrounded with the
 * screen held awake, which for a ten-minute sit means a lit phone in front of
 * you the whole time — at odds with the practice. The phone's own Timer does
 * the same job better, running with the screen off and the app closed.
 *
 * Duration did not go with it. Those habits keep `duration_min` as a tracking
 * field, so the capture form still asks how long — the number is now reported
 * rather than measured in-app, which is what the timer's "I already did it"
 * skip amounted to anyway.
 *
 * PracticeTimer and PracticeBreathPacer still exist, reachable only from the
 * (currently unrouted) PracticeSessionScreen. Deleting them is a separate
 * decision — the pacer in particular is a guided breathing animation, not a
 * timer, and nothing here replaces it.
 */
export const HabitCompletionModal: React.FC<Props> = ({
  visible,
  habitName,
  practiceId,
  templateId,
  metricGoals,
  logOnly = false,
  initialDate,
  lockDate = false,
  onSubmit,
  onCancel,
}) => {
  const practice = getPractice(practiceId);
  // Curated habits take their template from the catalog; custom habits from the
  // preset they were created with. Undefined here means "no override" and lets
  // the capture flow fall back to the catalog lookup.
  const customTracking = practice ? undefined : resolveTemplateFields({ template_id: templateId });

  const accent =
    PRACTICE_GROUPS.find((g) => g.id === practice?.group)?.color ?? Colors.primary;
  // Bumped on each open to force a fresh <PracticeCaptureFlow> (resets its state).
  const [openKey, setOpenKey] = useState(0);

  // Reset on OPEN, not on close. Resetting on submit/cancel would collapse the
  // flow while it's still animating out — the user briefly sees the bare default
  // state. Resetting when it opens keeps the exit showing their last input
  // and guarantees a clean slate next time.
  useEffect(() => {
    if (visible) {
      setOpenKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <PracticeCaptureFlow
        key={openKey}
        practiceId={practiceId}
        tracking={customTracking?.length ? customTracking : undefined}
        metricGoals={metricGoals}
        title={habitName}
        accentColor={accent}
        compact={logOnly}
        initialDate={initialDate}
        lockDate={lockDate}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Modal>
  );
};
