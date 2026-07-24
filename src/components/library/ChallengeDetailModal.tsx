import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { LibraryChallenge } from '../../types';
import { getChallengeAmountSpec, fillChallengeAmount } from '../../utils/challengeAmount';
import {
  BARRIER_TYPES,
  TIME_CATEGORIES,
  ACTION_TYPES,
  LIBRARY_UI_TEXT,
} from '../../constants/challengeLibrary';
import { InfoModal } from './InfoModal';

// Duration options: 1 = today only, others = multi-day
const DURATION_OPTIONS = [
  { value: 1, label: 'Today' },
  { value: 3, label: '3' },
  { value: 7, label: '7' },
  { value: 14, label: '14' },
  { value: 21, label: '21' },
  { value: 30, label: '30' },
];

interface ChallengeDetailModalProps {
  visible: boolean;
  challenge: LibraryChallenge | null;
  onClose: () => void;
  onUseChallenge: (
    challenge: LibraryChallenge,
    duration: number,
    amount?: number
  ) => Promise<void>;
  isCreating?: boolean;
}

export const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({
  visible,
  challenge,
  onClose,
  onUseChallenge,
  isCreating = false,
}) => {
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1); // Default to "Today"
  // Quantity for challenges with an "X" placeholder (e.g. "Fast for X Hours").
  const [selectedAmount, setSelectedAmount] = useState(1);
  const [customAmount, setCustomAmount] = useState('');

  // Reset duration + amount when modal opens with a new challenge
  useEffect(() => {
    if (visible) {
      setSelectedDuration(1);
      const spec = challenge ? getChallengeAmountSpec(challenge.name) : null;
      setSelectedAmount(spec ? spec.default : 1);
      setCustomAmount('');
    }
  }, [visible, challenge?.id]);

  if (!challenge) return null;

  const amountSpec = getChallengeAmountSpec(challenge.name);
  const displayName = amountSpec
    ? fillChallengeAmount(challenge.name, selectedAmount)
    : challenge.name;

  const barrierType = challenge.barrier_type
    ? BARRIER_TYPES[challenge.barrier_type]
    : null;
  const timeCategory = challenge.time_category
    ? TIME_CATEGORIES[challenge.time_category]
    : null;
  const actionType = challenge.action_type
    ? ACTION_TYPES[challenge.action_type]
    : null;

  const getTimeDisplay = (): string => {
    if (challenge.time_required_minutes) {
      if (challenge.time_required_minutes >= 1440) {
        return 'All day';
      }
      if (challenge.time_required_minutes >= 60) {
        const hours = Math.floor(challenge.time_required_minutes / 60);
        return `${hours}hr+`;
      }
      return `${challenge.time_required_minutes} mins`;
    }
    return timeCategory?.description ?? '';
  };

  const handleUseChallenge = async () => {
    await onUseChallenge(challenge, selectedDuration, amountSpec ? selectedAmount : undefined);
    // Note: onClose is called by parent after successful creation
  };

  const amountInvalid = !!amountSpec && (!selectedAmount || selectedAmount <= 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Challenge Title (placeholder resolved to the chosen amount) */}
          <Text style={styles.title}>{displayName}</Text>

          {/* Metadata Bar */}
          <View style={styles.metadataBar}>
            <Text style={styles.metadataText}>
              {challenge.category} · {getTimeDisplay()}
            </Text>
            {barrierType && (
              <Text style={styles.metadataText}>
                {barrierType.name}
              </Text>
            )}
            {actionType && (
              <Text style={styles.metadataText}>
                {actionType.icon} {actionType.label}
              </Text>
            )}
          </View>

          {/* Why This Works Section */}
          {challenge.neuroscience_explanation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {LIBRARY_UI_TEXT.detailWhyItWorksTitle}
              </Text>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionBody}>
                  {challenge.neuroscience_explanation}
                </Text>
                {challenge.psychological_benefit && (
                  <>
                    <Text style={styles.benefitLabel}>Psychological Benefit:</Text>
                    <Text style={styles.sectionBody}>
                      {challenge.psychological_benefit}
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* What You'll Learn Section */}
          {challenge.what_youll_learn && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {LIBRARY_UI_TEXT.detailWhatYoullLearnTitle}
              </Text>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionBody}>
                  {challenge.what_youll_learn}
                </Text>
              </View>
            </View>
          )}

          {/* Common Resistance Section */}
          {challenge.common_resistance && challenge.common_resistance.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {LIBRARY_UI_TEXT.detailCommonResistanceTitle}
              </Text>
              <View style={styles.sectionCard}>
                {challenge.common_resistance.map((resistance, index) => (
                  <Text key={index} style={styles.listItem}>
                    • "{resistance}"
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* The Challenge Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {LIBRARY_UI_TEXT.detailTheChallengeTitle}
            </Text>
            <View style={styles.sectionCard}>
              {challenge.description && (
                <Text style={styles.sectionBody}>{challenge.description}</Text>
              )}
              {challenge.success_criteria && (
                <>
                  <Text style={styles.benefitLabel}>
                    {LIBRARY_UI_TEXT.detailSuccessCriteriaLabel}
                  </Text>
                  <Text style={styles.sectionBody}>
                    {challenge.success_criteria}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Variations Section */}
          {challenge.variations && challenge.variations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Variations</Text>
              <View style={styles.sectionCard}>
                {challenge.variations.map((variation, index) => (
                  <View key={index} style={styles.variationRow}>
                    <Text style={styles.variationLabel}>{variation.label}:</Text>
                    <Text style={styles.variationDescription}>{variation.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Info Buttons Row */}
          <View style={styles.infoButtonsRow}>
            {challenge.real_world_examples && challenge.real_world_examples.length > 0 && (
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowExamplesModal(true)}
              >
                <Text style={styles.infoButtonText}>
                  {LIBRARY_UI_TEXT.detailExamplesButton} ⓘ
                </Text>
              </TouchableOpacity>
            )}
            {(challenge.completion_count !== undefined || challenge.average_actual_difficulty !== undefined) && (
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowStatsModal(true)}
              >
                <Text style={styles.infoButtonText}>
                  {LIBRARY_UI_TEXT.detailCommunityStatsButton} ⓘ
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Amount, Duration Selector & Use Button */}
        <View style={styles.footer}>
          {/* Amount picker — only for challenges with an "X" placeholder */}
          {amountSpec && (
            <>
              <Text style={styles.durationLabel}>How many {amountSpec.unitLabel}?</Text>
              <View style={styles.durationRow}>
                {amountSpec.presets.map((val) => {
                  const active = customAmount === '' && selectedAmount === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.durationChip, active && styles.durationChipSelected]}
                      onPress={() => {
                        setSelectedAmount(val);
                        setCustomAmount('');
                      }}
                    >
                      <Text style={[styles.durationChipText, active && styles.durationChipTextSelected]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  style={[styles.amountInput, customAmount !== '' && styles.amountInputActive]}
                  placeholder="Custom"
                  placeholderTextColor={Colors.gray}
                  keyboardType="number-pad"
                  value={customAmount}
                  maxLength={4}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^0-9]/g, '');
                    setCustomAmount(clean);
                    const n = parseInt(clean, 10);
                    if (!Number.isNaN(n) && n > 0) setSelectedAmount(n);
                  }}
                />
              </View>
            </>
          )}

          {/* Duration Selector */}
          <Text style={styles.durationLabel}>How long do you want to commit?</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationChip,
                  selectedDuration === option.value && styles.durationChipSelected,
                  option.value === 1 && styles.durationChipToday,
                  option.value === 1 && selectedDuration === 1 && styles.durationChipTodaySelected,
                ]}
                onPress={() => setSelectedDuration(option.value)}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    selectedDuration === option.value && styles.durationChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedDuration > 1 && (
            <Text style={styles.durationHint}>
              You'll check in each day. Every day completed earns XP!
            </Text>
          )}

          <TouchableOpacity
            style={[styles.useButton, (isCreating || amountInvalid) && styles.useButtonDisabled]}
            onPress={handleUseChallenge}
            activeOpacity={0.8}
            disabled={isCreating || amountInvalid}
          >
            <Text style={styles.useButtonText}>
              {isCreating
                ? 'Starting...'
                : selectedDuration === 1
                  ? 'Start Challenge'
                  : `Start ${selectedDuration}-Day Challenge`}
            </Text>
          </TouchableOpacity>

        </View>

        {/* Examples Modal */}
        <InfoModal
          visible={showExamplesModal}
          title={LIBRARY_UI_TEXT.examplesModalTitle}
          onClose={() => setShowExamplesModal(false)}
        >
          {challenge.real_world_examples?.map((example, index) => (
            <Text key={index} style={styles.modalListItem}>
              • {example}
            </Text>
          ))}
        </InfoModal>

        {/* Community Stats Modal */}
        <InfoModal
          visible={showStatsModal}
          title={LIBRARY_UI_TEXT.communityStatsModalTitle}
          onClose={() => setShowStatsModal(false)}
        >
          {challenge.completion_count !== undefined && (
            <Text style={styles.modalText}>
              {challenge.completion_count} {LIBRARY_UI_TEXT.communityStatsCompletedLabel}
            </Text>
          )}
          {challenge.average_actual_difficulty !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.modalLabel}>
                {LIBRARY_UI_TEXT.communityStatsDifficultyLabel}
              </Text>
              <Text style={styles.modalText}>
                {challenge.average_actual_difficulty.toFixed(1)} / 5
              </Text>
            </View>
          )}
        </InfoModal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  metadataBar: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metadataText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  sectionBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
  },
  benefitLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  listItem: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    fontStyle: 'italic',
  },
  variationRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  variationLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  variationDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
  },
  infoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  infoButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  durationLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  durationChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    minWidth: 44,
    alignItems: 'center',
  },
  amountInput: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    minWidth: 72,
    textAlign: 'center',
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  amountInputActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    color: Colors.white,
  },
  durationChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationChipToday: {
    paddingHorizontal: Spacing.lg,
  },
  durationChipTodaySelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationChipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  durationChipTextSelected: {
    color: Colors.white,
  },
  durationHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  useButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  useButtonDisabled: {
    opacity: 0.6,
  },
  useButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  modalListItem: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  modalText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  modalLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  statRow: {
    marginTop: Spacing.md,
  },
});
