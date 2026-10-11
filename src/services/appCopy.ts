import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// =============================================================================
// APP COPY — wording the admin can edit live, without a release.
//
// Every editable string has a stable key ("today.empty") and its default
// wording in the code. An admin edit is stored in Firestore under that key and
// wins over the default for everyone on their next app open. Deleting the doc
// restores the default. Styling never lives here: `**double asterisks**` only
// say WHICH words get the emphasis style the screen already defines, and
// `{name}` placeholders are filled in by the screen.
// =============================================================================

const COLLECTION = 'appCopy';

export type CopyVars = Record<string, string | number>;

export interface CopySegment {
  text: string;
  /** Rendered in the screen's existing emphasis style. */
  bold: boolean;
}

/** Fill `{name}` placeholders. Unknown placeholders are left visible so a typo is obvious. */
export const interpolate = (text: string, vars?: CopyVars): string =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;

/** Split on `**…**`. An unmatched `**` is kept as literal text. */
export const parseBold = (text: string): CopySegment[] => {
  const segments: CopySegment[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });
  return segments.length ? segments : [{ text: '', bold: false }];
};

/** Plain text for places that can't style a span (alerts, placeholders, titles). */
export const stripBold = (text: string): string => text.replace(/\*\*(.+?)\*\*/g, '$1');

export const placeholdersIn = (text: string): string[] =>
  [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];

/** Placeholders the default uses that an edit dropped — the screen would lose that value. */
export const missingPlaceholders = (defaultText: string, edited: string): string[] => {
  const kept = new Set(placeholdersIn(edited));
  return placeholdersIn(defaultText).filter((p) => !kept.has(p));
};

/** The wording to show: the admin's edit if there is one, else the default. */
export const resolveCopy = (
  key: string,
  defaultText: string,
  overrides: Record<string, string>
): string => {
  const edited = overrides[key];
  return typeof edited === 'string' && edited.trim().length > 0 ? edited : defaultText;
};

// ---- Firestore ----------------------------------------------------------------

export const fetchCopyOverrides = async (): Promise<Record<string, string>> => {
  const snap = await getDocs(collection(db, COLLECTION));
  const out: Record<string, string> = {};
  snap.forEach((d) => {
    const text = d.data().text;
    if (typeof text === 'string') out[d.id] = text;
  });
  return out;
};

export const saveCopyOverride = async (key: string, text: string): Promise<void> => {
  await setDoc(doc(db, COLLECTION, key), { text, updated_at: new Date().toISOString() });
};

export const resetCopyOverride = async (key: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, key));
};
