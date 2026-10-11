import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { AdminScreenProps } from '../../types/navigation';
import {
  Practice,
  PracticeResearchEntry,
  INTENSITY_TIERS,
  IntensityLevel,
  HabitFlow,
} from '../../data/practices';
import {
  getAllPracticeCatalogItems,
  upsertPracticeCatalogItem,
  validatePractice,
} from '../../services/practiceCatalog';
import { HABIT_CATEGORIES, isHabitCategoryId } from '../../data/habitLibrary';

type Props = AdminScreenProps<'AdminPracticeEdit'>;

const FLOWS: HabitFlow[] = ['tap', 'timer', 'away', 'moment'];
const TIMER_DISPLAYS: NonNullable<Practice['timerDisplay']>[] = ['countdown', 'pacer', 'hidden'];

const linesToArray = (s: string): string[] =>
  s.split('\n').map((l) => l.trim()).filter(Boolean);

// "finding | source | url" per line ⇄ research entries. Entries missing a
// finding or source are dropped rather than saved half-formed.
const parseResearch = (s: string): PracticeResearchEntry[] =>
  linesToArray(s)
    .map((line) => {
      const [finding, source, url] = line.split('|').map((p) => p.trim());
      return { finding: finding ?? '', source: source ?? '', ...(url ? { url } : {}) };
    })
    .filter((r) => r.finding && r.source);

const researchToLines = (research?: PracticeResearchEntry[]): string =>
  (research ?? []).map((r) => [r.finding, r.source, r.url].filter(Boolean).join(' | ')).join('\n');

// ---- small form primitives -------------------------------------------------

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}> = ({ label, value, onChange, placeholder, multiline, hint }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {!!hint && <Text style={styles.hint}>{hint}</Text>}
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.gray}
      multiline={multiline}
    />
  </View>
);

const ChipPicker: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ label, options, value, onChange }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <View style={styles.toggleRow}>
    <Text style={[styles.label, styles.toggleLabel]}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.primary }} />
  </View>
);

export const AdminPracticeEditScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mode, practiceId } = route.params;
  const isEditing = mode === 'edit' && !!practiceId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  // The full original doc — spread on save so unedited fields (variations,
  // tracking, timer) are preserved even though the form doesn't expose them.
  const [original, setOriginal] = useState<Practice | null>(null);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('ellipse-outline');
  const [categoryId, setCategoryId] = useState<string>(HABIT_CATEGORIES[0].id);
  // '' = no tier set (no flames shown); otherwise an IntensityLevel id.
  const [intensity, setIntensity] = useState<string>('');
  const [core, setCore] = useState(false);
  const [active, setActive] = useState(true);
  const [target, setTarget] = useState('3');
  const [order, setOrder] = useState('99');
  const [whyItWorks, setWhyItWorks] = useState('');
  const [science, setScience] = useState('');
  const [howTo, setHowTo] = useState('');
  const [tips, setTips] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [research, setResearch] = useState('');
  const [resistanceMoment, setResistanceMoment] = useState('');
  const [optionalReason, setOptionalReason] = useState('');
  const [flow, setFlow] = useState<HabitFlow>('away');
  const [timerDisplay, setTimerDisplay] = useState<string>('');
  const [readyWhatYouDo, setReadyWhatYouDo] = useState('');
  const [readyOverride, setReadyOverride] = useState('');
  const [readyFocus, setReadyFocus] = useState('');
  const [readyCta, setReadyCta] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const all = await getAllPracticeCatalogItems();
        const p = all.find((x) => x.id === practiceId);
        if (p) {
          setOriginal(p);
          setId(p.id);
          setName(p.name);
          setDescription(p.description);
          // Every content field below is optional on HabitDefinition now that plain
          // library habits share the type — a habit with no science/howTo is valid.
          setIcon(p.icon ?? '');
          // A retired id ('Connection') shows no chip selected, so saving
          // forces a deliberate re-file.
          setCategoryId(isHabitCategoryId(p.category_id) ? p.category_id : '');
          setIntensity(p.intensity ?? '');
          setCore(!!p.core);
          setActive(p.active !== false);
          setTarget(String(p.suggested_target_per_week));
          setOrder(String(p.order ?? ''));
          setWhyItWorks(p.whyItWorks ?? '');
          setScience(p.science ?? '');
          setHowTo((p.howTo ?? []).join('\n'));
          setTips((p.tips ?? []).join('\n'));
          setMinimumVersion(p.minimumVersion ?? '');
          setResearch(researchToLines(p.research));
          setResistanceMoment(p.resistanceMoment ?? '');
          setOptionalReason(p.optional_reason ?? '');
          setFlow(p.flow ?? 'tap');
          setTimerDisplay(p.timerDisplay ?? '');
          // Legacy docs (expect/overrideUrge) arrive already normalized into
          // `override` by validatePractice; saving writes the new shape.
          setReadyWhatYouDo(p.ready?.whatYouDo ?? '');
          setReadyOverride(p.ready?.override ?? '');
          setReadyFocus(p.ready?.focus ?? '');
          setReadyCta(p.ready?.handoffCta ?? '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isEditing, practiceId]);

  const handleSave = async () => {
    const docId = isEditing ? practiceId! : id.trim();
    if (!docId) {
      Alert.alert('Required', 'Enter a unique id (e.g. "cold_shower").');
      return;
    }
    if (!isHabitCategoryId(categoryId)) {
      Alert.alert('Required', 'Pick a category.');
      return;
    }

    // Preserve unedited fields (variations, tracking, timer) by spreading the original.
    const ready =
      readyFocus.trim().length > 0
        ? {
            focus: readyFocus.trim(),
            ...(readyWhatYouDo.trim() ? { whatYouDo: readyWhatYouDo.trim() } : {}),
            ...(readyOverride.trim() ? { override: readyOverride.trim() } : {}),
            ...(readyCta.trim() ? { handoffCta: readyCta.trim() } : {}),
          }
        : undefined;

    const merged: Practice = {
      ...(original ?? {}),
      id: docId,
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim() || 'ellipse-outline',
      category_id: categoryId,
      core,
      active,
      suggested_target_per_week: Number(target) || 1,
      order: Number(order) || 99,
      whyItWorks: whyItWorks.trim(),
      science: science.trim(),
      howTo: linesToArray(howTo),
      tips: linesToArray(tips),
      flow,
      ...(timerDisplay ? { timerDisplay: timerDisplay as Practice['timerDisplay'] } : {}),
      ...(minimumVersion.trim() ? { minimumVersion: minimumVersion.trim() } : {}),
      ...(resistanceMoment.trim() ? { resistanceMoment: resistanceMoment.trim() } : {}),
      ...(optionalReason.trim() ? { optional_reason: optionalReason.trim() } : {}),
      ...(ready ? { ready } : {}),
    } as Practice;

    // Explicitly set or clear the tier — the `original` spread would otherwise
    // resurrect a cleared intensity on save.
    if (intensity) merged.intensity = intensity as IntensityLevel;
    else delete merged.intensity;

    // Always write research explicitly: an empty list is a deliberate blank
    // (it also stops the catalog merge from backfilling the bundled entries).
    merged.research = parseResearch(research);

    if (!validatePractice(merged)) {
      Alert.alert(
        'Missing fields',
        'Name and description are required.'
      );
      return;
    }

    setSaving(true);
    try {
      await upsertPracticeCatalogItem(merged);
      Alert.alert('Saved', 'Live for users on their next app open.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!isEditing && (
        <Field
          label="ID"
          value={id}
          onChange={setId}
          placeholder="cold_shower"
          hint="Stable, lowercase, no spaces. Cannot change later."
        />
      )}

      <Field label="Name" value={name} onChange={setName} placeholder="Cold Exposure" />
      <Field label="Description" value={description} onChange={setDescription} multiline placeholder="One-line overview" />
      <Field label="Icon" value={icon} onChange={setIcon} hint="Ionicons name, e.g. snow-outline" />

      <ChipPicker
        label="Category"
        value={categoryId}
        onChange={setCategoryId}
        options={HABIT_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
      />

      <ChipPicker
        label="Difficulty tier (the flame icons)"
        value={intensity}
        onChange={setIntensity}
        options={[
          { value: '', label: 'None' },
          ...INTENSITY_TIERS.map((t) => ({
            value: t.id,
            label: `${'🔥'.repeat(t.flames)} ${t.label}`,
          })),
        ]}
      />
      {!!intensity && (
        <Text style={styles.tierHint}>
          {INTENSITY_TIERS.find((t) => t.id === intensity)?.description}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.rowHalf}>
          <Field label="Target / week" value={target} onChange={setTarget} placeholder="3" />
        </View>
        <View style={styles.rowHalf}>
          <Field label="Order" value={order} onChange={setOrder} placeholder="99" />
        </View>
      </View>

      <Toggle label="Core habit (added to new accounts by default)" value={core} onChange={setCore} />
      <Toggle label="Active (shown to users)" value={active} onChange={setActive} />

      <ChipPicker
        label="Flow"
        value={flow}
        onChange={(v) => setFlow(v as HabitFlow)}
        options={FLOWS.map((f) => ({ value: f, label: f }))}
      />
      {flow === 'timer' && (
        <ChipPicker
          label="Timer display"
          value={timerDisplay}
          onChange={setTimerDisplay}
          options={TIMER_DISPLAYS.map((t) => ({ value: t, label: t }))}
        />
      )}

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Learn content</Text>
      <Field label="Why it works (hook)" value={whyItWorks} onChange={setWhyItWorks} multiline />
      <Field label="Science (explainer)" value={science} onChange={setScience} multiline />
      <Field label="How to" value={howTo} onChange={setHowTo} multiline hint="One step per line" />
      <Field label="Tips & cautions" value={tips} onChange={setTips} multiline hint="One per line. Prefix a line with CAUTION: for a warning." />
      <Field label="Minimum version (optional)" value={minimumVersion} onChange={setMinimumVersion} multiline />
      <Field
        label="Research (optional)"
        value={research}
        onChange={setResearch}
        multiline
        hint={'One study per line: finding | source | url\ne.g. Cyclic sighing beat mindfulness for mood in a 1-month RCT. | Stanford, 2023 — Cell Reports Medicine | https://…'}
      />
      <Field label="Optional reason (optional)" value={optionalReason} onChange={setOptionalReason} multiline hint="Why it isn't core (for optional habits)" />

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Override & briefing</Text>
      <Field label="Resistance moment (optional)" value={resistanceMoment} onChange={setResistanceMoment} multiline hint="The signature 'get-out' urge, e.g. 'the cold hit and everything said get out'" />
      <Field label="Ready · What you'll do (optional)" value={readyWhatYouDo} onChange={setReadyWhatYouDo} multiline hint="The concrete procedure — setup + duration, 1–2 sentences." />
      <Field label="Ready · The override (optional)" value={readyOverride} onChange={setReadyOverride} multiline hint="The urge: when it arrives, and that not obeying it is the exercise. Omit if no difficulty spike." />
      <Field label="Ready · Focus" value={readyFocus} onChange={setReadyFocus} multiline hint="Required to show a briefing. The one anchor/technique to hold onto." />
      <Field label="Ready · Handoff button (optional)" value={readyCta} onChange={setReadyCta} hint='e.g. "Begin" / "Put your phone down"' />

      <Text style={styles.note}>
        Variations and detailed tracking fields aren’t editable here yet — they’re preserved from the existing
        definition on save.
      </Text>

      <Button title={saving ? 'Saving…' : 'Save'} onPress={handleSave} loading={saving} style={{ marginTop: Spacing.lg }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  field: { marginBottom: Spacing.md },
  label: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark, marginBottom: Spacing.xs },
  hint: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginBottom: Spacing.xs },
  input: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  chipTextActive: { color: Colors.white },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  // Lets a long label wrap instead of shoving the switch past the margin.
  toggleLabel: { flex: 1, marginBottom: 0 },
  row: { flexDirection: 'row', gap: Spacing.md },
  rowHalf: { flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  sectionTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.md },
  note: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: Spacing.md, fontStyle: 'italic' },
  tierHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
});
