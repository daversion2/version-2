/**
 * The post-practice / post-challenge reflection — a single question, "What did
 * you notice your mind doing?", answered by tapping mind tags and/or writing
 * it out. The tags are a fixed vocabulary of what the mind does during an
 * override: nine Struggle moves and three Steady ones.
 *
 * Selected tag ids are stored structured (CompletionLog.mindTags /
 * Challenge.mind_tags) so they stay queryable; buildMindReflectionNote joins
 * everything into the human-readable note that history screens already render
 * (log notes / Challenge.reflection_note).
 *
 * This replaced the five-question admin-configurable CBT sequence
 * (challengeReflectionPrompts) in 2026-07.
 */

export const MIND_REFLECTION_PROMPT = 'What did you notice your mind doing?';
export const MIND_REFLECTION_HELPER =
  'Tap anything that showed up — or write it out.';

export interface MindTag {
  id: string;
  label: string;
  /** Example thought or short description shown under the label. */
  description: string;
}

export interface MindTagGroup {
  id: 'struggle' | 'steady';
  title: string;
  tags: MindTag[];
}

export const MIND_TAG_GROUPS: MindTagGroup[] = [
  {
    id: 'struggle',
    title: 'Struggle',
    tags: [
      {
        id: 'bargaining',
        label: 'Bargaining',
        description: '“Just a little less still counts.”',
      },
      {
        id: 'rationalizing',
        label: 'Rationalizing',
        description: '“I have somewhere to be.”',
      },
      {
        id: 'catastrophizing',
        label: 'Catastrophizing',
        description: '“I can’t handle this.”',
      },
      {
        id: 'resisting',
        label: 'Resisting',
        description: 'Clenching against the sensation instead of letting it happen.',
      },
      {
        id: 'doubting',
        label: 'Doubting',
        description: '“What’s the point of this?”',
      },
      {
        id: 'comparing',
        label: 'Comparing',
        description: '“Last time was easier.”',
      },
      {
        id: 'judging',
        label: 'Judging',
        description: '“I’m too weak for this.”',
      },
      {
        id: 'spiraling',
        label: 'Spiraling',
        description: 'One uncomfortable thought snowballing into a string of others.',
      },
      {
        id: 'escaping',
        label: 'Escaping',
        description: 'Mentally drifting to unrelated thoughts to avoid being present with it.',
      },
    ],
  },
  {
    id: 'steady',
    title: 'Steady',
    tags: [
      {
        id: 'letting-go',
        label: 'Letting go',
        description: 'A real moment of acceptance, the fight easing off.',
      },
      {
        id: 'watching',
        label: 'Watching',
        description: 'Observing the sensation with curiosity instead of reacting to it.',
      },
      {
        id: 'pushing',
        label: 'Pushing',
        description: 'Actively coaching yourself forward.',
      },
    ],
  },
];

/** A tag plus which group it belongs to — the flat lookup shape. */
export type MindTagWithGroup = MindTag & { group: MindTagGroup['id'] };

const TAGS_BY_ID: Record<string, MindTagWithGroup> = Object.fromEntries(
  MIND_TAG_GROUPS.flatMap((g) => g.tags.map((t) => [t.id, { ...t, group: g.id }]))
);

export const getMindTag = (id: string): MindTagWithGroup | undefined => TAGS_BY_ID[id];

export const getMindTagLabel = (id: string): string => TAGS_BY_ID[id]?.label ?? id;

/**
 * Build the human-readable reflection note — the free text first, then a
 * "Noticed:" line with the selected tag labels. Returns '' when the user
 * skipped both.
 */
export const buildMindReflectionNote = (text: string, tagIds: string[]): string => {
  const parts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) parts.push(trimmed);
  if (tagIds.length) parts.push(`Noticed: ${tagIds.map(getMindTagLabel).join(', ')}`);
  if (!parts.length) return '';
  return `${MIND_REFLECTION_PROMPT}\n${parts.join('\n')}`;
};
