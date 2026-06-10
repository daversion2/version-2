import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { showAlert } from '../../utils/alert';
import { getRuleById, createRule, updateRule } from '../../services/rules';
import {
  Rule,
  RuleCondition,
  RuleContent,
  RuleEvent,
  RuleFrequency,
  RuleFrequencyType,
  RuleOperator,
  RuleSurface,
  RULE_EVENTS,
  RULE_FACTS,
  RULE_OPERATORS,
  FactKey,
} from '../../types/rules';
import { AdminNavigation, AdminStackParamList } from '../../types/navigation';

type EditRoute = RouteProp<AdminStackParamList, 'AdminRuleEdit'>;

const SURFACES: { value: RuleSurface; label: string }[] = [
  { value: 'push', label: 'Push notification' },
  { value: 'modal', label: 'In-app modal' },
  { value: 'banner', label: 'Banner' },
];

const FREQUENCIES: { value: RuleFrequencyType; label: string }[] = [
  { value: 'once_ever', label: 'Once ever' },
  { value: 'once_per_day', label: 'Once per day' },
  { value: 'cooldown_hours', label: 'Cooldown (hours)' },
  { value: 'always', label: 'No cap' },
];

const FACT_KEYS = Object.keys(RULE_FACTS) as FactKey[];

interface ChipRowProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

function ChipRow<T extends string>({ options, selected, onSelect }: ChipRowProps<T>) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, selected === opt.value && styles.chipSelected]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, selected === opt.value && styles.chipTextSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export const AdminRuleEditScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const route = useRoute<EditRoute>();
  const { mode, ruleId } = route.params;

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [surface, setSurface] = useState<RuleSurface>('push');
  const [event, setEvent] = useState<RuleEvent>('scheduled_hourly');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [frequencyType, setFrequencyType] = useState<RuleFrequencyType>('once_per_day');
  const [cooldownHours, setCooldownHours] = useState('72');
  const [priority, setPriority] = useState('0');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !ruleId) return;
    (async () => {
      try {
        const rule = await getRuleById(ruleId);
        if (!rule) {
          showAlert('Not Found', 'This rule no longer exists.', () => navigation.goBack());
          return;
        }
        setName(rule.name);
        setDescription(rule.description || '');
        setEnabled(rule.enabled);
        setSurface(rule.surface);
        setEvent(rule.event);
        setConditions(rule.conditions);
        setFrequencyType(rule.frequency.type);
        setCooldownHours(String(rule.frequency.hours ?? 72));
        setPriority(String(rule.priority));
        setTitle(rule.content.title);
        setBody(rule.content.body);
        setCta(rule.content.cta || '');
      } catch (error: any) {
        showAlert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, ruleId]);

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const cycleOperator = (index: number) => {
    const current = conditions[index].op;
    const next = RULE_OPERATORS[(RULE_OPERATORS.indexOf(current) + 1) % RULE_OPERATORS.length];
    updateCondition(index, { op: next });
  };

  const cycleFact = (index: number, direction: 1 | -1) => {
    const current = conditions[index].fact;
    const idx = FACT_KEYS.indexOf(current);
    const next = FACT_KEYS[(idx + direction + FACT_KEYS.length) % FACT_KEYS.length];
    updateCondition(index, { fact: next });
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, { fact: 'days_since_last_activity', op: '>=', value: 2 }]);
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Missing Name', 'Give this rule a name so you can find it later.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      showAlert('Missing Content', 'Title and body are required — this is what the user sees.');
      return;
    }
    const parsedPriority = parseInt(priority, 10);
    const parsedHours = parseInt(cooldownHours, 10);
    if (frequencyType === 'cooldown_hours' && (!parsedHours || parsedHours < 1)) {
      showAlert('Invalid Cooldown', 'Cooldown must be at least 1 hour.');
      return;
    }
    for (const c of conditions) {
      if (Number.isNaN(c.value)) {
        showAlert('Invalid Condition', 'Every condition needs a numeric value.');
        return;
      }
    }

    const frequency: RuleFrequency =
      frequencyType === 'cooldown_hours'
        ? { type: frequencyType, hours: parsedHours }
        : { type: frequencyType };
    const content: RuleContent = {
      title: title.trim(),
      body: body.trim(),
      ...(cta.trim() ? { cta: cta.trim() } : {}),
    };
    const payload: Omit<Rule, 'id' | 'created_at' | 'updated_at'> = {
      name: name.trim(),
      description: description.trim(),
      enabled,
      surface,
      event,
      conditions,
      frequency,
      priority: Number.isNaN(parsedPriority) ? 0 : parsedPriority,
      content,
    };

    setSaving(true);
    try {
      if (mode === 'edit' && ruleId) {
        await updateRule(ruleId, payload);
      } else {
        await createRule(payload);
      }
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Basics */}
        <Card style={styles.section}>
          <View style={styles.enabledRow}>
            <Text style={styles.sectionTitle}>Rule</Text>
            <View style={styles.enabledToggle}>
              <Text style={styles.enabledLabel}>{enabled ? 'Enabled' : 'Disabled'}</Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ true: Colors.primary, false: Colors.border }}
              />
            </View>
          </View>
          <InputField label="Name" value={name} onChangeText={setName} placeholder="Comeback nudge" />
          <InputField
            label="Description (admin only)"
            value={description}
            onChangeText={setDescription}
            placeholder="What is this rule for?"
          />
        </Card>

        {/* Delivery */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          <Text style={styles.fieldLabel}>Surface</Text>
          <ChipRow options={SURFACES} selected={surface} onSelect={setSurface} />
          <Text style={styles.fieldLabel}>Evaluated on</Text>
          <ChipRow options={RULE_EVENTS} selected={event} onSelect={setEvent} />
          {surface === 'push' && event !== 'scheduled_hourly' && (
            <Text style={styles.warnText}>
              Push rules are only evaluated on the hourly schedule — pick "Hourly schedule" for
              push.
            </Text>
          )}
        </Card>

        {/* Conditions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions (all must match)</Text>
          {conditions.length === 0 && (
            <Text style={styles.hintText}>
              No conditions — this rule matches every user. The frequency cap below is the only
              limit.
            </Text>
          )}
          {conditions.map((cond, index) => (
            <View key={index} style={styles.conditionRow}>
              <View style={styles.factPicker}>
                <TouchableOpacity onPress={() => cycleFact(index, -1)} style={styles.factArrow}>
                  <Ionicons name="chevron-back" size={16} color={Colors.gray} />
                </TouchableOpacity>
                <Text style={styles.factText} numberOfLines={2}>
                  {RULE_FACTS[cond.fact] ?? cond.fact}
                </Text>
                <TouchableOpacity onPress={() => cycleFact(index, 1)} style={styles.factArrow}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.opButton} onPress={() => cycleOperator(index)}>
                <Text style={styles.opText}>{cond.op}</Text>
              </TouchableOpacity>
              <View style={styles.valueInputWrap}>
                <InputField
                  label=""
                  value={String(cond.value)}
                  onChangeText={(t) => updateCondition(index, { value: parseFloat(t) })}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <TouchableOpacity onPress={() => removeCondition(index)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={22} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addConditionButton} onPress={addCondition}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.addConditionText}>Add condition</Text>
          </TouchableOpacity>
          <Text style={styles.hintText}>
            Tip: for scheduled push rules, add "{RULE_FACTS.local_hour} == 18" so the push lands at
            a sensible local time instead of the moment the condition first becomes true.
          </Text>
        </Card>

        {/* Frequency */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency cap</Text>
          <ChipRow options={FREQUENCIES} selected={frequencyType} onSelect={setFrequencyType} />
          {frequencyType === 'cooldown_hours' && (
            <InputField
              label="Minimum hours between fires"
              value={cooldownHours}
              onChangeText={setCooldownHours}
              keyboardType="numeric"
              placeholder="72"
            />
          )}
          <InputField
            label="Priority (higher fires first when rules collide)"
            value={priority}
            onChangeText={setPriority}
            keyboardType="numeric"
            placeholder="0"
          />
        </Card>

        {/* Content */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Content</Text>
          <InputField label="Title" value={title} onChangeText={setTitle} placeholder="We miss you" />
          <InputField
            label="Body"
            value={body}
            onChangeText={setBody}
            placeholder="One small win today gets you moving again."
            multiline
            numberOfLines={3}
            style={styles.bodyInput}
          />
          {surface !== 'push' && (
            <InputField
              label="CTA label (optional)"
              value={cta}
              onChangeText={setCta}
              placeholder="Get back on track"
            />
          )}

          {/* Preview */}
          <Text style={styles.fieldLabel}>Preview</Text>
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{title || 'Title'}</Text>
            <Text style={styles.previewBody}>{body || 'Body text appears here.'}</Text>
            {surface !== 'push' && cta.trim() !== '' && (
              <View style={styles.previewCta}>
                <Text style={styles.previewCtaText}>{cta}</Text>
              </View>
            )}
          </View>
        </Card>

        <Button
          title={mode === 'edit' ? 'Save Changes' : 'Create Rule'}
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  // Keeps the form readable when running in a desktop browser
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  enabledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enabledToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  enabledLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  fieldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  chipTextSelected: {
    color: Colors.white,
    fontFamily: Fonts.secondaryBold,
  },
  warnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
  hintText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  factPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
  },
  factArrow: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  factText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
    textAlign: 'center',
  },
  opButton: {
    width: 44,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
  },
  opText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  valueInputWrap: {
    width: 72,
    marginBottom: -Spacing.md, // InputField has built-in bottom margin
  },
  removeButton: {
    padding: Spacing.xs,
  },
  addConditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addConditionText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  bodyInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  preview: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  previewTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  previewBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  previewCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  previewCtaText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
});
