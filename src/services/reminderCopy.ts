// =============================================================================
// REMINDER COPY — what the user typed, as something the OS can show them.
//
// A habit's action plan holds an ANCHOR ("have my coffee") and optionally a
// PAIRING ("my podcast"). The reminder body wraps the anchor in "Right after
// you …", which only works if the anchor is a bare verb phrase in the first
// person. The onboarding field invites exactly that — and people also type
// "after I brush my teeth", because the prompt reads like a sentence.
//
// The original implementation replaced the single word "my" and shipped the
// rest verbatim, so that second shape reached the lock screen as
//
//     "Right after you I brush your teeth."
//
// This module exists because that text is not a rendering detail: it is the
// user's own words, quoted back to them by a notification, and a notification
// is the one surface they cannot correct or dismiss their way out of reading.
//
// It is NOT a general English transformer, and trying to make it one would be a
// mistake. It handles the shapes people actually type, leaves anything else
// alone, and falls back to anchorless copy when it cannot produce a clean
// phrase. Pure and tested — the app has no other way to see this output before
// a real device shows it to someone.
// =============================================================================

/**
 * Connectives people prepend because the prompt reads like a sentence. Stripped
 * because the template already supplies "Right after you".
 *
 * `(?:\s+|$)` rather than `\s+`: an anchor of just "after" has to reduce to
 * nothing so the caller falls back, instead of surviving whole and rendering
 * "Right after you after."
 */
const LEADING_CONNECTIVE = /^(?:right\s+)?(?:after|when|once|whenever|as\s+soon\s+as)(?:\s+|$)/i;

/**
 * A LEADING first-person subject, which must be REMOVED rather than converted —
 * the template already supplies "you", so emitting "you've eaten" here would
 * render "Right after you you've eaten".
 *
 * Where the verb form differs between persons it is conjugated on the way out
 * ("I'm done" → "are done"), because dropping the subject alone would leave
 * "am done". First match wins, so the bare-subject rule is last. All are
 * end-anchored too, so an anchor of "after I" reduces to nothing and the caller
 * falls back rather than rendering a fragment.
 *
 * Safe against words that merely start with i: "ice cream" has no word boundary
 * after the i.
 */
const LEADING_SUBJECT_FORMS: [RegExp, string][] = [
  [/^i'?m\b\s*/i, 'are '],
  [/^i\s+am\b\s*/i, 'are '],
  [/^i'?ve\b\s*/i, 'have '],
  [/^i\s+have\b\s*/i, 'have '],
  [/^i'?ll\b\s*/i, 'will '],
  [/^i\s+will\b\s*/i, 'will '],
  [/^i\s+was\b\s*/i, 'were '],
  [/^i(?:\s+|$)/i, ''],
];

/**
 * First-person → second-person for everything that is NOT the leading subject.
 * Here "I" really does become "you" ("shower and I get dressed" → "shower and
 * you get dressed"). Longest forms first so "I'm" is handled before the bare
 * "I" rule can produce "you'm"; verb agreement is covered for the copulas,
 * which are the ones that read as broken English rather than as a typo.
 */
const FIRST_PERSON_REPLACEMENTS: [RegExp, string][] = [
  [/\bmyself\b/gi, 'yourself'],
  [/\bmine\b/gi, 'yours'],
  [/\bmy\b/gi, 'your'],
  [/\bi'?m\b/gi, "you're"],
  [/\bi'?ve\b/gi, "you've"],
  [/\bi'?ll\b/gi, "you'll"],
  [/\bi\s+am\b/gi, 'you are'],
  [/\bi\s+was\b/gi, 'you were'],
  [/\bi\b/gi, 'you'],
  [/\bme\b/gi, 'you'],
];

/**
 * A leading SECOND-person subject, after the conversions above have run.
 *
 * This is the structural guarantee that the result can follow "Right after
 * you …": whatever route the text took to get here, a leading "you" is
 * redundant with the template and gets removed, conjugating as it goes. The
 * case that motivated it was "me and my coffee" — a leading object pronoun used
 * colloquially as a subject, which the mid-phrase rules correctly turn into
 * "you and your coffee" and which would then have read "Right after you you
 * and your coffee". Enforcing the invariant at the end covers that input and
 * every future one like it.
 */
const LEADING_SECOND_PERSON_FORMS: [RegExp, string][] = [
  [/^you'?re\b\s*/i, 'are '],
  [/^you'?ve\b\s*/i, 'have '],
  [/^you'?ll\b\s*/i, 'will '],
  [/^you(?:\s+|$)/i, ''],
];

/** Collapse whitespace and drop trailing sentence punctuation the template supplies. */
const tidy = (phrase: string): string => phrase.replace(/\s+/g, ' ').trim().replace(/[.,;!]+$/, '');

/**
 * An anchor phrase as it should read after "Right after you …".
 *
 * Returns null when nothing usable is left — the caller must then fall back to
 * copy that doesn't quote the anchor, rather than emitting "Right after you .".
 */
export const anchorAsSecondPerson = (anchor?: string): string | null => {
  if (!anchor) return null;
  let phrase = tidy(anchor);
  if (!phrase) return null;

  // Strip the connective first, then a subject it was hiding: "after I shower".
  phrase = tidy(phrase.replace(LEADING_CONNECTIVE, ''));
  const subjectForm = LEADING_SUBJECT_FORMS.find(([pattern]) => pattern.test(phrase));
  if (subjectForm) phrase = tidy(phrase.replace(subjectForm[0], subjectForm[1]));
  if (!phrase) return null;

  for (const [pattern, replacement] of FIRST_PERSON_REPLACEMENTS) {
    phrase = phrase.replace(pattern, replacement);
  }
  phrase = tidy(phrase);

  // Enforce the "no leading you" invariant last, whatever route got us here.
  const secondPerson = LEADING_SECOND_PERSON_FORMS.find(([pattern]) => pattern.test(phrase));
  if (secondPerson) phrase = tidy(phrase.replace(secondPerson[0], secondPerson[1]));

  return phrase || null;
};

/** The anchor and pairing a reminder body is built from. */
export interface ReminderCopyPlan {
  anchor?: string;
  pairing?: string;
}

/**
 * The notification body for a habit reminder.
 *
 * The pairing is quoted as the user wrote it but never used as a clause subject,
 * so it needs no rewriting — "Don't forget my podcast" is how they'd say it.
 */
export const reminderBody = (plan: ReminderCopyPlan = {}): string => {
  const anchor = anchorAsSecondPerson(plan.anchor);
  const pairing = plan.pairing ? tidy(plan.pairing) : '';

  if (anchor && pairing) return `Right after you ${anchor}. Don't forget ${pairing} 🎧`;
  if (anchor) return `Right after you ${anchor} — a few minutes is all it takes.`;
  if (pairing) return `Make it enjoyable — pair it with ${pairing} 🎧`;
  return 'A few minutes now is all it takes.';
};
