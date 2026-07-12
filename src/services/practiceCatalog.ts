import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  Practice,
  PracticeGroup,
  BUNDLED_PRACTICES,
  setPracticeCatalog,
} from '../data/practices';

// =============================================================================
// PRACTICE CATALOG — the curated practices, editable without a code change.
//
// One Firestore doc per practice (doc id = the stable practice id, e.g.
// 'meditation'), fields mirroring the Practice interface. The bundled defaults
// (data/practices.ts) ship in the binary and act as the fallback; the live
// catalog is the validated Firestore catalog merged over those defaults.
//
// Editing is admin-only (see firestore.rules); reads are open to any signed-in
// user. Edits go live on the user's next app open (loadPracticeCatalog runs at
// startup). See docs/practice-experience-build-plan.md.
// =============================================================================

const COLLECTION = 'practiceCatalog';
const catalogRef = () => collection(db, COLLECTION);

const GROUPS: PracticeGroup[] = ['activate', 'calm', 'restrain', 'custom'];
const FLOWS: Practice['flow'][] = ['timer', 'away', 'moment'];

const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

/**
 * Validate a raw Firestore doc into a Practice. Returns null on anything
 * malformed — the caller then falls back to the bundled default for that id, so
 * a bad edit can never crash the app or blank out a practice.
 */
export const validatePractice = (raw: any): Practice | null => {
  if (!raw || typeof raw !== 'object') return null;
  const okEnum =
    GROUPS.includes(raw.group) &&
    FLOWS.includes(raw.flow) &&
    typeof raw.core === 'boolean' &&
    typeof raw.suggested_target_per_week === 'number' &&
    typeof raw.order === 'number';
  const okStrings = isStr(raw.id) && isStr(raw.name) && isStr(raw.description) && isStr(raw.icon);
  const okContent = isStr(raw.whyItWorks) && isStr(raw.science) && isStrArray(raw.howTo) && isStrArray(raw.tips);
  if (!okEnum || !okStrings || !okContent) return null;
  const practice = raw as Practice;
  // Legacy remote docs may still carry the old ready shape (`expect` +
  // `overrideUrge`, since merged into `override`). Normalize here so the Ready
  // screen keeps its override block until the doc is re-saved from the admin
  // editor, which writes the new shape.
  const ready = raw.ready;
  if (ready && !ready.override && (ready.expect || ready.overrideUrge)) {
    practice.ready = {
      ...ready,
      override: [ready.expect, ready.overrideUrge].filter(isStr).join(' '),
    };
  }
  // Keep only well-formed research entries; a malformed one shouldn't drop the doc.
  if (raw.research !== undefined) {
    practice.research = Array.isArray(raw.research)
      ? raw.research.filter((r: any) => r && isStr(r.finding) && isStr(r.source))
      : undefined;
  }
  // Same leniency for techniques: drop malformed entries, keep the doc.
  if (raw.techniques !== undefined) {
    practice.techniques = Array.isArray(raw.techniques)
      ? raw.techniques.filter((t: any) => t && isStr(t.label) && isStrArray(t.steps))
      : undefined;
  }
  return practice;
};

/** Read every catalog doc, validated. Drops malformed docs (logged). */
const readCatalogDocs = async (): Promise<Practice[]> => {
  const snap = await getDocs(catalogRef());
  const out: Practice[] = [];
  snap.forEach((d) => {
    const valid = validatePractice({ id: d.id, ...d.data() });
    if (valid) out.push(valid);
    else console.warn(`[practiceCatalog] dropped malformed doc: ${d.id}`);
  });
  return out;
};

/**
 * The live catalog = bundled defaults with any valid Firestore doc overlaid by
 * id, plus brand-new Firestore-only practices. Bundled ids with no (valid)
 * remote doc keep the bundled version, so the app degrades gracefully.
 */
export const fetchPracticeCatalog = async (): Promise<Practice[]> => {
  const remote = await readCatalogDocs();
  const remoteById = new Map(remote.map((p) => [p.id, p]));
  const merged: Practice[] = [];
  const seen = new Set<string>();
  for (const bundled of BUNDLED_PRACTICES) {
    const remoteDoc = remoteById.get(bundled.id);
    // Remote docs seeded before the `research`/`techniques`/`howToTitle` fields
    // existed shadow the bundled entries; backfill from bundled until the doc is
    // re-saved. An admin can still blank a section by saving an explicit empty list.
    merged.push(
      remoteDoc
        ? {
            ...remoteDoc,
            research: remoteDoc.research ?? bundled.research,
            techniques: remoteDoc.techniques ?? bundled.techniques,
            howToTitle: remoteDoc.howToTitle ?? bundled.howToTitle,
          }
        : bundled
    );
    seen.add(bundled.id);
  }
  for (const p of remote) {
    if (!seen.has(p.id)) merged.push(p);
  }
  return merged;
};

/**
 * Fetch the catalog and swap it into the live cache. Best-effort: on any failure
 * the app keeps the bundled defaults already in the cache. Call once at startup.
 */
export const loadPracticeCatalog = async (): Promise<void> => {
  try {
    const merged = await fetchPracticeCatalog();
    setPracticeCatalog(merged);
  } catch (err) {
    console.warn('[practiceCatalog] load failed, keeping bundled defaults:', err);
  }
};

// ---- Admin ----------------------------------------------------------------

/**
 * Raw catalog for the admin editor: the bundled defaults overlaid with whatever
 * is in Firestore (including retired, `active: false` items). Bundled practices
 * not yet in Firestore appear too, so the admin can edit them (the first save
 * writes the doc). Identical merge to fetchPracticeCatalog — kept explicit for clarity.
 */
export const getAllPracticeCatalogItems = async (): Promise<Practice[]> => fetchPracticeCatalog();

/**
 * Create or overwrite a catalog doc (doc id = practice id). Mirrors
 * `ready.override` into the legacy `overrideUrge` field so production bundles
 * from before the Ready rework keep their override block; drop the mirror once
 * that OTA is fully rolled out.
 */
export const upsertPracticeCatalogItem = async (practice: Practice): Promise<void> => {
  const ready = practice.ready?.override
    ? { ...practice.ready, overrideUrge: practice.ready.override }
    : practice.ready;
  await setDoc(doc(db, COLLECTION, practice.id), {
    ...practice,
    ...(ready ? { ready } : {}),
    updated_at: new Date().toISOString(),
  });
};

/** Retire / restore a practice without deleting it (keeps adopted instances working). */
export const setPracticeActive = async (id: string, active: boolean): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), { active, updated_at: new Date().toISOString() });
};

/** Hard-delete a catalog doc. Prefer setPracticeActive(false) for bundled practices. */
export const deletePracticeCatalogItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};

/**
 * One-time seed: write every bundled practice into Firestore so the catalog has
 * editable docs. Safe to re-run — it overwrites each doc with the bundled version.
 */
export const seedPracticeCatalogFromBundled = async (): Promise<number> => {
  for (const p of BUNDLED_PRACTICES) {
    await upsertPracticeCatalogItem(p);
  }
  return BUNDLED_PRACTICES.length;
};
