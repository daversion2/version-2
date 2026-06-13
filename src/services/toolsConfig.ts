/**
 * Admin-configurable Tools (CBT worksheets) — mirrors the onboarding config
 * pattern in onboardingConfig.ts. The library of tools and their categories
 * live in the config/tools Firestore document, editable from Admin > Tools.
 * The hardcoded WORKSHEET_TEMPLATES array remains the canonical DEFAULT used
 * as the fallback and the "Reset to defaults" source.
 *
 * FAIL-SAFE: there is no draft/publish step, so reads sanitize aggressively —
 * tools missing an id/name are dropped, fields with an unknown type or no
 * options (for select/checklist) are dropped, icon/color fall back to curated
 * values, categories are guaranteed non-empty, and a fetch failure or timeout
 * yields the bundled defaults.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { WORKSHEET_TEMPLATES } from '../data/worksheetTemplates';
import {
  WorksheetTemplate,
  WorksheetSection,
  WorksheetField,
  WorksheetFieldType,
} from '../types';

export interface ToolCategory {
  id: string;
  label: string;
}

/** A configurable tool — a worksheet template plus an enabled flag. */
export interface ToolDefinition extends WorksheetTemplate {
  enabled: boolean;
}

export interface ToolsConfig {
  categories: ToolCategory[];
  tools: ToolDefinition[];
}

// ---------- Curated pickers ----------

/** Whitelisted Ionicons offered in the admin icon picker. */
export const TOOL_ICONS: string[] = [
  'document-text',
  'warning',
  'arrow-down-circle',
  'checkbox',
  'bulb',
  'heart',
  'leaf',
  'sunny',
  'cloud',
  'compass',
  'flag',
  'flame',
  'flash',
  'shield-checkmark',
  'happy',
  'sad',
  'eye',
  'fitness',
  'pulse',
  'sparkles',
  'telescope',
  'trail-sign',
  'navigate',
  'medal',
];

export const DEFAULT_TOOL_ICON = 'document-text';

/** Whitelisted accent colors offered in the admin color picker. */
export const TOOL_COLORS: string[] = [
  '#217180', // teal (thought record)
  '#FF5B02', // orange (distortions)
  '#1565C0', // blue (core belief)
  '#2E7D32', // green (action plan)
  '#6A1B9A', // purple
  '#AD1457', // magenta
  '#00897B', // teal-green
  '#5D4037', // brown
  '#455A64', // blue-gray
  '#E65100', // deep orange
];

export const DEFAULT_TOOL_COLOR = '#217180';

// ---------- Defaults ----------

export const DEFAULT_TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'beliefs', label: 'Beliefs' },
  { id: 'behavior', label: 'Behavior' },
];

export const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
  categories: DEFAULT_TOOL_CATEGORIES,
  tools: WORKSHEET_TEMPLATES.map((t) => ({ ...t, enabled: true })),
};

const VALID_FIELD_TYPES: WorksheetFieldType[] = [
  'text',
  'textarea',
  'mood_scale',
  'checklist',
  'single_select',
];

const configDocRef = () => doc(db, 'config', 'tools');

// ---------- Sanitize (fail-safe read) ----------

const asString = (v: any, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const asStringArray = (v: any): string[] =>
  Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter((s) => s !== '') : [];

const clampInt = (v: any, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
};

const sanitizeField = (raw: any, idx: number): WorksheetField | null => {
  if (!raw || typeof raw !== 'object') return null;
  const field_type = raw.field_type as WorksheetFieldType;
  if (!VALID_FIELD_TYPES.includes(field_type)) return null;

  const options = asStringArray(raw.options);
  if ((field_type === 'checklist' || field_type === 'single_select') && options.length === 0) {
    return null; // selectable fields need at least one option
  }

  const field: WorksheetField = {
    id: asString(raw.id) || `field-${idx}`,
    label: asString(raw.label, 'Untitled field'),
    field_type,
    required: raw.required === true,
  };
  if (raw.placeholder !== undefined) field.placeholder = asString(raw.placeholder);
  if (raw.helper_text !== undefined) field.helper_text = asString(raw.helper_text);
  if (options.length > 0) field.options = options;
  if (typeof raw.max_length === 'number' && raw.max_length > 0) {
    field.max_length = Math.round(raw.max_length);
  }
  return field;
};

const sanitizeSection = (raw: any, idx: number): WorksheetSection | null => {
  if (!raw || typeof raw !== 'object') return null;
  const fields = Array.isArray(raw.fields)
    ? (raw.fields.map(sanitizeField).filter(Boolean) as WorksheetField[])
    : [];
  if (fields.length === 0) return null; // a section with no fields can't render usefully
  const section: WorksheetSection = {
    id: asString(raw.id) || `section-${idx}`,
    title: asString(raw.title, 'Untitled section'),
    fields,
  };
  if (raw.description !== undefined) section.description = asString(raw.description);
  return section;
};

const sanitizeCategories = (raw: any): ToolCategory[] => {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const clean: ToolCategory[] = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    const id = asString(c.id).trim();
    const label = asString(c.label).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    clean.push({ id, label: label || id });
  }
  return clean.length > 0 ? clean : DEFAULT_TOOL_CATEGORIES;
};

const sanitizeTool = (
  raw: any,
  idx: number,
  categoryIds: string[]
): ToolDefinition | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = asString(raw.id).trim();
  const name = asString(raw.name).trim();
  if (!id || !name) return null;

  const sections = Array.isArray(raw.sections)
    ? (raw.sections.map(sanitizeSection).filter(Boolean) as WorksheetSection[])
    : [];

  const icon = TOOL_ICONS.includes(raw.icon) ? raw.icon : DEFAULT_TOOL_ICON;
  const color = TOOL_COLORS.includes(raw.color) ? raw.color : DEFAULT_TOOL_COLOR;
  const category = categoryIds.includes(raw.category) ? raw.category : categoryIds[0];

  const tool: ToolDefinition = {
    id,
    name,
    trigger_line: asString(raw.trigger_line),
    short_description: asString(raw.short_description),
    long_description: asString(raw.long_description),
    category,
    difficulty: clampInt(raw.difficulty, 1, 3, 1),
    estimated_minutes: clampInt(raw.estimated_minutes, 1, 120, 10),
    icon,
    color,
    when_to_use: asString(raw.when_to_use),
    sections,
    enabled: raw.enabled !== false,
  };
  const tips = asStringArray(raw.tips);
  if (tips.length > 0) tool.tips = tips;
  return tool;
};

/**
 * Sanitize a stored tools config into a guaranteed-renderable shape.
 * Exported for tests / reuse on save.
 */
export const sanitizeToolsConfig = (raw: any): ToolsConfig => {
  const categories = sanitizeCategories(raw?.categories);
  const categoryIds = categories.map((c) => c.id);
  const seen = new Set<string>();
  const tools: ToolDefinition[] = [];
  const rawTools = Array.isArray(raw?.tools) ? raw.tools : [];
  rawTools.forEach((t: any, idx: number) => {
    const tool = sanitizeTool(t, idx, categoryIds);
    if (!tool || seen.has(tool.id)) return;
    seen.add(tool.id);
    tools.push(tool);
  });
  return { categories, tools };
};

// ---------- Reads ----------

export const getToolsConfig = async (): Promise<ToolsConfig> => {
  try {
    const snap = await getDoc(configDocRef());
    if (!snap.exists()) return DEFAULT_TOOLS_CONFIG;
    return sanitizeToolsConfig(snap.data());
  } catch (err) {
    console.warn('Tools config fetch failed — using defaults:', err);
    return DEFAULT_TOOLS_CONFIG;
  }
};

/** Fetch with a hard timeout so a slow connection never stalls the Tools tab. */
export const getToolsConfigWithTimeout = (ms = 3000): Promise<ToolsConfig> =>
  Promise.race([
    getToolsConfig(),
    new Promise<ToolsConfig>((resolve) => setTimeout(() => resolve(DEFAULT_TOOLS_CONFIG), ms)),
  ]);

// ---------- Admin writes ----------

export const saveToolsConfig = async (config: ToolsConfig): Promise<void> => {
  const clean = sanitizeToolsConfig(config);
  await setDoc(configDocRef(), {
    categories: clean.categories,
    tools: clean.tools,
    updated_at: new Date().toISOString(),
  });
};

/** Delete the override doc — tools revert to the hardcoded defaults. */
export const resetToolsConfig = async (): Promise<void> => {
  await deleteDoc(configDocRef());
};

// ---------- Factory for "Add tool" ----------

export const newToolDefinition = (suffix: string): ToolDefinition => ({
  id: `tool-${suffix}`,
  name: 'New tool',
  trigger_line: '',
  short_description: '',
  long_description: '',
  category: DEFAULT_TOOL_CATEGORIES[0].id,
  difficulty: 1,
  estimated_minutes: 10,
  icon: DEFAULT_TOOL_ICON,
  color: DEFAULT_TOOL_COLOR,
  when_to_use: '',
  tips: [],
  enabled: true,
  sections: [
    {
      id: `section-${suffix}`,
      title: 'Section 1',
      fields: [
        {
          id: `field-${suffix}`,
          label: 'Your response',
          field_type: 'textarea',
          required: true,
        },
      ],
    },
  ],
});
