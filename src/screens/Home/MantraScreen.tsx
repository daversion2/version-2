import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { Mantra } from '../../types';
import {
  addMantra,
  updateMantra,
  deleteMantra,
  setActiveMantra,
  migrateRedirectMantra,
} from '../../services/mantras';
import { MANTRA_EXAMPLES, MANTRA_TIPS } from '../../data/mantras';
import { showAlert } from '../../utils/alert';

const MAX_MANTRAS = 5;
const MAX_LENGTH = 100;

// Short-form tips shown inline in the add form
const QUICK_TIPS = [
  'Keep it to 5–8 words',
  'Make it believable — not aspirational',
  'Anchor it to a specific trigger moment',
  'Ground it in identity, not outcome',
];

type Props = NativeStackScreenProps<any, 'MantraScreen'>;

export const MantraScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();

  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Adding state
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState('');

  // Expandable sections state
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [howToExpanded, setHowToExpanded] = useState(false);
  const [scienceExpanded, setScienceExpanded] = useState(false);

  // Load and migrate on mount
  useEffect(() => {
    const init = async () => {
      if (!user || !userProfile) { setLoading(false); return; }

      // Migrate legacy redirect_mantra if needed
      if ((!userProfile.mantras || userProfile.mantras.length === 0) && userProfile.redirect_mantra) {
        await migrateRedirectMantra(user.uid, userProfile.redirect_mantra);
        await refreshProfile();
      }
      setLoading(false);
    };
    init();
  }, []);

  // Sync from userProfile
  useEffect(() => {
    if (userProfile) {
      setMantras(userProfile.mantras || []);
      setActiveId(userProfile.active_mantra_id);
    }
  }, [userProfile]);

  const handleSetActive = useCallback(async (mantraId: string) => {
    if (!user || mantraId === activeId) return;
    setSaving(true);
    try {
      await setActiveMantra(user.uid, mantraId);
      await refreshProfile();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  }, [user, activeId, refreshProfile]);

  const handleStartEdit = useCallback((mantra: Mantra) => {
    setEditingId(mantra.id);
    setEditText(mantra.text);
    setAddingNew(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!user || !editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateMantra(user.uid, editingId, trimmed, mantras);
      await refreshProfile();
      setEditingId(null);
      setEditText('');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [user, editingId, editText, mantras, refreshProfile]);

  const handleDelete = useCallback((mantraId: string) => {
    Alert.alert(
      'Delete Mantra',
      'Are you sure you want to remove this mantra?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setSaving(true);
            try {
              await deleteMantra(user.uid, mantraId, mantras, activeId);
              await refreshProfile();
              if (editingId === mantraId) {
                setEditingId(null);
                setEditText('');
              }
            } catch (err: any) {
              showAlert('Error', err.message || 'Failed to delete.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [user, mantras, activeId, editingId, refreshProfile]);

  const handleAddMantra = useCallback(async (text: string) => {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addMantra(user.uid, trimmed, mantras);
      await refreshProfile();
      setAddingNew(false);
      setNewText('');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to add mantra.');
    } finally {
      setSaving(false);
    }
  }, [user, mantras, refreshProfile]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header description */}
      <Text style={styles.description}>
        Your redirect mantra interrupts negative thought patterns and gives your brain a clear instruction to follow.
      </Text>

      {/* Best practices tips */}
      <TouchableOpacity
        style={styles.tipsHeader}
        onPress={() => setTipsExpanded(!tipsExpanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
        <Text style={styles.tipsHeaderText}>What makes a good mantra?</Text>
        <Ionicons
          name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.primary}
        />
      </TouchableOpacity>
      {tipsExpanded && (
        <View style={styles.tipsContainer}>
          {MANTRA_TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipItem, i === MANTRA_TIPS.length - 1 && { marginBottom: 0 }]}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          ))}
        </View>
      )}

      {/* How to use a mantra */}
      <TouchableOpacity
        style={styles.tipsHeader}
        onPress={() => setHowToExpanded(!howToExpanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="repeat-outline" size={18} color={Colors.primary} />
        <Text style={styles.tipsHeaderText}>How to use a mantra</Text>
        <Ionicons
          name={howToExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.primary}
        />
      </TouchableOpacity>
      {howToExpanded && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipBody}>
            When you catch yourself spiraling into a negative thought pattern — rumination, self-doubt, anxiety — that's your cue.
          </Text>
          <View style={styles.howToSteps}>
            <View style={styles.howToStep}>
              <Text style={styles.howToStepNumber}>1</Text>
              <View style={styles.howToStepContent}>
                <Text style={styles.tipTitle}>Notice the pattern</Text>
                <Text style={styles.tipBody}>Recognize when your mind is looping on something unhelpful. The awareness itself is the first win.</Text>
              </View>
            </View>
            <View style={styles.howToStep}>
              <Text style={styles.howToStepNumber}>2</Text>
              <View style={styles.howToStepContent}>
                <Text style={styles.tipTitle}>Cut it off</Text>
                <Text style={styles.tipBody}>Internally tell yourself to stop. Don't negotiate with the thought — interrupt it.</Text>
              </View>
            </View>
            <View style={styles.howToStep}>
              <Text style={styles.howToStepNumber}>3</Text>
              <View style={styles.howToStepContent}>
                <Text style={styles.tipTitle}>Redirect with your mantra</Text>
                <Text style={styles.tipBody}>Repeat your mantra — silently or out loud — until you feel the grip of the negative thought loosen. The mantra gives your brain something concrete to hold onto instead.</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.tipBody, { marginTop: Spacing.sm }]}>
            The goal isn't to feel amazing. It's to break the loop and regain control of your attention. Over time, this redirect becomes faster and more automatic.
          </Text>
        </View>
      )}

      {/* Science behind mantras */}
      <TouchableOpacity
        style={styles.tipsHeader}
        onPress={() => setScienceExpanded(!scienceExpanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="flask-outline" size={18} color={Colors.primary} />
        <Text style={styles.tipsHeaderText}>Science behind mantras</Text>
        <Ionicons
          name={scienceExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.primary}
        />
      </TouchableOpacity>
      {scienceExpanded && (
        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Neural Plasticity</Text>
            <Text style={styles.tipBody}>
              Hebbian learning — "neurons that fire together, wire together." Repeatedly activating the same thought pattern strengthens the synaptic connections involved. Mantras deliberately recruit this: the more you repeat a phrase, the more automatic and accessible that neural pathway becomes, eventually shifting default cognitive patterns.
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Default Mode Network (DMN)</Text>
            <Text style={styles.tipBody}>
              The DMN is the "mind-wandering" network associated with rumination, anxiety, and self-referential negative thought. A 2015 study in Brain and Behavior found that focused repetition of a word or phrase reduced DMN activity similarly to other forms of meditation — essentially quieting the noise.
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Cortisol and Stress Response</Text>
            <Text style={styles.tipBody}>
              Studies on mantra-based meditation (like Transcendental Meditation) consistently show reductions in cortisol. A meta-analysis in Psychosomatic Medicine found TM produced significantly greater reductions in psychological stress than other relaxation techniques.
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipTitle}>Self-Affirmation Theory</Text>
            <Text style={styles.tipBody}>
              Psychologist Claude Steele's research, extended by David Creswell, shows that repeating value-affirming statements activates reward circuitry — specifically the ventromedial prefrontal cortex — and reduces threat responses. fMRI studies confirmed this directly: self-affirmation changes which brain regions activate under stress.
            </Text>
          </View>
          <View style={{ marginBottom: 0 }}>
            <Text style={styles.tipTitle}>Implementation Intentions</Text>
            <Text style={styles.tipBody}>
              Peter Gollwitzer's research on "if X, then I will do Y" structures — essentially a formatted mantra — shows they dramatically increase follow-through on goals, more so than motivation or willpower alone. This is probably the most robust behavioral science finding in this space.
            </Text>
          </View>
        </View>
      )}

      {/* Mantra list */}
      {mantras.map(mantra => {
        const isActive = mantra.id === activeId;
        const isEditing = editingId === mantra.id;

        return (
          <Card key={mantra.id} style={[styles.mantraCard, isActive && styles.mantraCardActive]}>
            {isEditing ? (
              // Edit mode
              <View>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  maxLength={MAX_LENGTH}
                  autoFocus
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() => { setEditingId(null); setEditText(''); }}
                    style={styles.editBtn}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={!editText.trim() || saving}
                    style={[styles.editBtn, !editText.trim() && styles.disabledBtn]}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Display mode
              <View>
                <TouchableOpacity
                  style={styles.mantraRow}
                  onPress={() => handleSetActive(mantra.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isActive ? Colors.primary : Colors.gray}
                    style={styles.radioIcon}
                  />
                  <Text style={[styles.mantraText, isActive && styles.mantraTextActive]}>
                    "{mantra.text}"
                  </Text>
                </TouchableOpacity>
                <View style={styles.mantraActions}>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity onPress={() => handleStartEdit(mantra)} style={styles.iconBtn}>
                    <Ionicons name="pencil-outline" size={18} color={Colors.gray} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(mantra.id)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.gray} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        );
      })}

      {/* Empty state */}
      {mantras.length === 0 && !addingNew && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>You don't have any mantras yet.</Text>
          <Button
            title="Add Your First Mantra"
            onPress={() => setAddingNew(true)}
            variant="secondary"
          />
        </Card>
      )}

      {/* Add new section */}
      {addingNew && (
        <Card style={styles.addCard}>
          <Text style={styles.addLabel}>NEW MANTRA</Text>
          <TextInput
            style={styles.editInput}
            value={newText}
            onChangeText={setNewText}
            placeholder="Type your mantra..."
            placeholderTextColor={Colors.gray}
            maxLength={MAX_LENGTH}
            autoFocus
            multiline
          />
          <Text style={styles.charCount}>{newText.length}/{MAX_LENGTH}</Text>

          {/* Quick tips */}
          <View style={styles.quickTipsContainer}>
            {QUICK_TIPS.map((tip, i) => (
              <View key={i} style={styles.quickTipRow}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} style={styles.quickTipIcon} />
                <Text style={styles.quickTipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Suggestion chips */}
          <Text style={styles.suggestionsLabel}>Or pick one:</Text>
          <View style={styles.chipContainer}>
            {MANTRA_EXAMPLES.filter(ex => !mantras.some(m => m.text === ex)).map(example => (
              <TouchableOpacity
                key={example}
                style={[
                  styles.chip,
                  newText === example && styles.chipSelected,
                ]}
                onPress={() => setNewText(example)}
              >
                <Text style={[
                  styles.chipText,
                  newText === example && styles.chipTextSelected,
                ]}>
                  {example}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={() => { setAddingNew(false); setNewText(''); }}
              style={styles.editBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAddMantra(newText)}
              disabled={!newText.trim() || saving}
              style={[styles.editBtn, !newText.trim() && styles.disabledBtn]}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add Mantra'}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Add button (when not already adding and under max) */}
      {!addingNew && mantras.length > 0 && mantras.length < MAX_MANTRAS && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setAddingNew(true); setEditingId(null); }}
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add Mantra</Text>
        </TouchableOpacity>
      )}

      {/* Counter */}
      {mantras.length > 0 && (
        <Text style={styles.counter}>{mantras.length} / {MAX_MANTRAS} mantras</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  tipsHeaderText: {
    flex: 1,
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  tipsContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipItem: {
    marginBottom: Spacing.md,
  },
  tipTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  tipBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  howToSteps: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  howToStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  howToStepNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    width: 28,
    marginTop: -2,
  },
  howToStepContent: {
    flex: 1,
  },
  quickTipsContainer: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  quickTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  quickTipIcon: {
    marginRight: Spacing.xs,
    marginTop: 1,
  },
  quickTipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    flex: 1,
    lineHeight: 18,
  },
  mantraCard: {
    marginBottom: Spacing.md,
  },
  mantraCardActive: {
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  mantraRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  mantraText: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    fontStyle: 'italic',
  },
  mantraTextActive: {
    color: Colors.primary,
  },
  mantraActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingLeft: 30,
  },
  activeBadge: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs - 1,
    color: Colors.primary,
    letterSpacing: 1,
  },
  iconBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  editInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
    minHeight: 44,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  editBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  cancelText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  saveText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  addCard: {
    marginBottom: Spacing.md,
  },
  addLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  suggestionsLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
  },
  chipTextSelected: {
    color: Colors.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  counter: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
