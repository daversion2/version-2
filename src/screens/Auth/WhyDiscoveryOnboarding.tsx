import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  WHY_DISCOVERY_STAGES,
  MINDFULNESS_CONTEXT,
  MINDFULNESS_TIMER_SECONDS,
} from '../../constants/whyDiscovery';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  markOnboardingComplete,
  saveUsername,
  validateUsername,
  checkUsernameAvailable,
} from '../../services/users';
import { getActiveRewardMessages, RewardMessage } from '../../services/rewardMessages';
import { seedUserRewardMessagesFromGlobals } from '../../services/userRewardMessages';
import { createGoalWithActions } from '../../services/goals';

const { width } = Dimensions.get('window');

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;


export const WhyDiscoveryOnboarding: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [currentStage, setCurrentStage] = useState(1);
  const [saving, setSaving] = useState(false);

  // Stage 1: Username
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Stage 2: Mindfulness
  const [mindfulnessPhase, setMindfulnessPhase] = useState<'context' | 'timer'>('context');
  const [timerSeconds, setTimerSeconds] = useState(MINDFULNESS_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  // Stage 3: Reflection
  const [reflectionNoticed, setReflectionNoticed] = useState('');
  const [reflectionWorkOn, setReflectionWorkOn] = useState('');

  // Stage 4: Goal Setup
  const [goalName, setGoalName] = useState('');
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Stage 5: Action Type

  // Stage 6: Habit
  const [habitName, setHabitName] = useState('');
  const [habitFrequency, setHabitFrequency] = useState(3);

  // Stage 7: Reward Messages
  const [globalMessages, setGlobalMessages] = useState<RewardMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActiveRewardMessages()
      .then(setGlobalMessages)
      .catch((err) => console.warn('Failed to load reward messages:', err));
  }, []);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / WHY_DISCOVERY_STAGES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStage]);

  // Countdown timer
  useEffect(() => {
    if (!timerActive) return;
    if (timerSeconds <= 0) {
      setTimerActive(false);
      goToStage(3);
      return;
    }
    const id = setTimeout(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timerActive, timerSeconds]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToStage = (stage: number) => {
    setCurrentStage(stage);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = async () => {
    if (!validateCurrentStage()) return;

    // Stage 2 context → timer
    if (currentStage === 2 && mindfulnessPhase === 'context') {
      setMindfulnessPhase('timer');
      setTimerActive(true);
      return;
    }

    // Stage 3 → 4: pre-fill goal name
    if (currentStage === 3) {
      setGoalName(reflectionWorkOn.trim());
    }

    if (currentStage < WHY_DISCOVERY_STAGES.length) {
      goToStage(currentStage + 1);
    } else {
      await handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (currentStage === 2 && mindfulnessPhase === 'timer') {
      setTimerActive(false);
      setTimerSeconds(MINDFULNESS_TIMER_SECONDS);
      setMindfulnessPhase('context');
      return;
    }
    if (currentStage > 1) goToStage(currentStage - 1);
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateCurrentStage = (): boolean => {
    switch (currentStage) {
      case 1:
        if (username.trim().length < 3) {
          Alert.alert('Required', 'Please enter a username (at least 3 characters).');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        if (!reflectionWorkOn.trim()) {
          Alert.alert('Required', 'Please share one area you want to focus on.');
          return false;
        }
        return true;
      case 4:
        if (!goalName.trim()) {
          Alert.alert('Required', 'Please enter a goal name.');
          return false;
        }
        {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (endDate <= today) {
            Alert.alert('Invalid Date', 'Target date must be in the future.');
            return false;
          }
        }
        return true;
      case 5:
        return true;
      case 6:
        if (!habitName.trim()) {
          Alert.alert('Required', 'Please name your habit.');
          return false;
        }
        return true;
      case 7:
        if (selectedMessageIds.size < 3) {
          Alert.alert('Required', 'Please select at least 3 reward messages.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // ============================================================================
  // SUBMIT
  // ============================================================================

  const handleFinalSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const actions = {
        habits: [
          {
            name: habitName.trim(),
            target_count_per_week: habitFrequency,
          },
        ],
      };

      await createGoalWithActions(
        user.uid,
        { name: goalName.trim(), end_date: toYYYYMMDD(endDate) },
        actions
      );

      if (selectedMessageIds.size > 0) {
        await seedUserRewardMessagesFromGlobals(user.uid, Array.from(selectedMessageIds));
      }

      await markOnboardingComplete(user.uid, true); // deferred=true
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // STAGE 1: USERNAME
  // ============================================================================

  const handleUsernameNext = async () => {
    const trimmed = username.trim();
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      setUsernameError(validation.error || 'Invalid username');
      return;
    }
    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailable(trimmed);
      if (!available) {
        setUsernameError('This username is already taken');
        return;
      }
      setUsernameError('');
      if (user) await saveUsername(user.uid, trimmed);
      goToStage(2);
    } catch {
      setUsernameError('Error checking username');
    } finally {
      setCheckingUsername(false);
    }
  };

  const toggleMessageSelection = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEndDate(date);
  };

  // ============================================================================
  // RENDER STAGES
  // ============================================================================

  const renderStage1 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.welcomeTitle}>Welcome to Neuro Nudge</Text>
      <Text style={styles.welcomeBody}>
        Build real habits. Understand what drives you.{'\n\n'}
        Let's start with a username.
      </Text>
      <View style={styles.usernameContainer}>
        <TextInput
          style={[styles.usernameInput, usernameError ? styles.usernameInputError : null]}
          placeholder="Choose a username"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setUsernameError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        {checkingUsername && (
          <ActivityIndicator color={Colors.white} style={{ marginTop: Spacing.sm }} />
        )}
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : (
          <Text style={styles.hintTextWhite}>3–20 characters, letters, numbers, underscores</Text>
        )}
      </View>
    </View>
  );

  const renderStage2 = () => {
    if (mindfulnessPhase === 'context') {
      return (
        <View style={styles.stageContent}>
          <Text style={styles.stageIntro}>{MINDFULNESS_CONTEXT}</Text>
          <View style={styles.mindfulnessCard}>
            <Ionicons name="ear-outline" size={32} color={Colors.primary} />
            <Text style={styles.mindfulnessCardText}>
              When you tap "Begin", a 60-second timer will start. Put the phone down and just sit.
            </Text>
          </View>
        </View>
      );
    }

    // Timer phase
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes}:${String(seconds).padStart(2, '0')}`;

    return (
      <View style={[styles.stageContent, styles.timerCenter]}>
        <Text style={styles.timerLabel}>Sit quietly. Notice your thoughts.</Text>
        <View style={styles.timerRing}>
          <Text style={styles.timerDisplay}>{display}</Text>
        </View>
        <Text style={styles.timerSubtext}>
          {timerSeconds > 0 ? 'The app will continue automatically.' : 'Time\'s up. Take a breath.'}
        </Text>
      </View>
    );
  };

  const renderStage3 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        That internal voice you noticed? That's what this app helps you work with.
      </Text>

      <Text style={styles.promptQuestion}>What did you notice in that moment?</Text>
      <Text style={styles.optionalBadge}>Optional</Text>
      <TextInput
        style={styles.multilineInput}
        value={reflectionNoticed}
        onChangeText={setReflectionNoticed}
        placeholder="Thoughts, feelings, distractions..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={3}
        maxLength={400}
        textAlignVertical="top"
      />

      <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>
        What's one area of your life you want to work on?
      </Text>
      <Text style={styles.requiredBadge}>Required</Text>
      <TextInput
        style={styles.multilineInput}
        value={reflectionWorkOn}
        onChangeText={setReflectionWorkOn}
        placeholder="e.g., my fitness, my focus at work, building a morning routine..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={3}
        maxLength={200}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStage4 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        Let's turn that into a goal. You can refine this later.
      </Text>

      <Text style={styles.promptQuestion}>Goal name</Text>
      <TextInput
        style={styles.singleLineInput}
        value={goalName}
        onChangeText={setGoalName}
        placeholder="e.g., Run a 5K, Read 20 books, Start meditating daily"
        placeholderTextColor={Colors.gray}
        maxLength={80}
        returnKeyType="done"
      />

      <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>Target date</Text>
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setShowDatePicker(!showDatePicker)}
      >
        <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        <Text style={styles.dateSelectorText}>{formatDate(endDate)}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.gray} />
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      <View style={styles.datePresets}>
        {[30, 60, 90].map((days) => {
          const d = new Date();
          d.setDate(d.getDate() + days);
          const active = toYYYYMMDD(d) === toYYYYMMDD(endDate);
          return (
            <TouchableOpacity
              key={days}
              style={[styles.presetChip, active && styles.presetChipActive]}
              onPress={() => setEndDate(d)}
            >
              <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                {days} days
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStage5 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        Build a habit to work toward this goal — something you can do regularly.
      </Text>

      <View style={[styles.actionCard, styles.actionCardSelected]}>
        <View style={styles.actionCardHeader}>
          <View style={[styles.actionCardIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="repeat" size={24} color={Colors.primary} />
          </View>
          <View style={styles.actionCardTitle}>
            <Text style={styles.actionCardName}>Build a regular practice</Text>
            <Text style={styles.actionCardType}>Habit</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
        </View>
        <Text style={styles.actionCardDesc}>
          Something you'll do multiple times a week. Great for skills, routines, or things you want to make automatic.
        </Text>
        <View style={styles.actionCardExamples}>
          <Text style={styles.actionCardExample}>• Read 20 min/day</Text>
          <Text style={styles.actionCardExample}>• Morning journaling</Text>
          <Text style={styles.actionCardExample}>• 5x/week workout</Text>
        </View>
      </View>
    </View>
  );

  const renderStage6 = () => {
    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>
          Name your habit — something you can realistically do multiple times a week.
        </Text>

        <Text style={styles.promptQuestion}>Habit name</Text>
        <TextInput
          style={styles.singleLineInput}
          value={habitName}
          onChangeText={setHabitName}
          placeholder="e.g., Read for 20 minutes"
          placeholderTextColor={Colors.gray}
          maxLength={100}
          returnKeyType="done"
        />

        <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>How many times per week?</Text>
        <View style={styles.freqRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.freqChip, habitFrequency === n && styles.freqChipActive]}
              onPress={() => setHabitFrequency(n)}
            >
              <Text style={[styles.freqChipText, habitFrequency === n && styles.freqChipTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.freqLabel}>{habitFrequency}x per week</Text>

      </View>
    );
  };

  const renderStage7 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        These messages appear when you complete a challenge. Pick the ones that hit hardest — you can always change them later.
      </Text>
      <Text style={styles.hintText}>Pick at least 3 ({selectedMessageIds.size} selected)</Text>
      {globalMessages.map((msg) => {
        const isSelected = selectedMessageIds.has(msg.id);
        return (
          <TouchableOpacity
            key={msg.id}
            style={[styles.messageChip, isSelected && styles.messageChipSelected]}
            onPress={() => toggleMessageSelection(msg.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.messageChipText, isSelected && styles.messageChipTextSelected]}>
              {msg.text}
            </Text>
            {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const stageInfo = WHY_DISCOVERY_STAGES[currentStage - 1];
  const isLastStage = currentStage === WHY_DISCOVERY_STAGES.length;
  const isStage1 = currentStage === 1;

  const isNextDisabled =
    saving ||
    checkingUsername ||
    (currentStage === 3 && !reflectionWorkOn.trim()) ||
    (currentStage === 6 && !habitName.trim()) ||
    (currentStage === 7 && selectedMessageIds.size < 3);

  const nextButtonTitle = (() => {
    if (currentStage === 2 && mindfulnessPhase === 'context') return 'Begin →';
    if (currentStage === 2 && mindfulnessPhase === 'timer') return "I'm ready";
    if (isLastStage) return "Let's Go";
    return 'Continue';
  })();

  if (isStage1) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>{renderStage1()}</View>
        <Button
          title="Continue"
          onPress={handleUsernameNext}
          disabled={username.trim().length < 3 || checkingUsername}
          loading={checkingUsername}
          style={styles.welcomeButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.stageHeader}>
        <View style={styles.stageHeaderTop}>
          <View style={styles.stageIndicatorRow}>
            {WHY_DISCOVERY_STAGES.map((stage, idx) => (
              <View
                key={stage.id}
                style={[
                  styles.stageDot,
                  idx + 1 <= currentStage && styles.stageDotActive,
                  idx + 1 === currentStage && styles.stageDotCurrent,
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={styles.stageLabel}>{stageInfo.label}</Text>
        <Text style={styles.stageSubtitle}>{stageInfo.subtitle}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentStage === 2 && renderStage2()}
        {currentStage === 3 && renderStage3()}
        {currentStage === 4 && renderStage4()}
        {currentStage === 5 && renderStage5()}
        {currentStage === 6 && renderStage6()}
        {currentStage === 7 && renderStage7()}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Button
          title={nextButtonTitle}
          onPress={handleNext}
          disabled={isNextDisabled}
          loading={saving}
          style={styles.nextButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Stage 1 — Welcome / Username
  welcomeContainer: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  welcomeContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeButton: { width: width - Spacing.lg * 2, marginBottom: Spacing.xxl },
  welcomeTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.white, textAlign: 'center', marginBottom: Spacing.md },
  welcomeBody: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.white, textAlign: 'center', opacity: 0.9, lineHeight: 24 },
  usernameContainer: { width: width - Spacing.lg * 2, marginTop: Spacing.xl },
  usernameInput: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Fonts.secondary, fontSize: FontSizes.lg, color: Colors.white, textAlign: 'center', borderWidth: 2, borderColor: 'transparent' },
  usernameInputError: { borderColor: '#FF6B6B' },
  errorText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: '#FF6B6B', textAlign: 'center', marginTop: Spacing.sm },
  hintTextWhite: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.white, textAlign: 'center', marginTop: Spacing.sm, opacity: 0.7 },

  // Main flow chrome
  screen: { flex: 1, backgroundColor: Colors.white },
  progressBarContainer: { height: 4, backgroundColor: Colors.lightGray },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  stageHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  stageHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  stageIndicatorRow: { flexDirection: 'row', gap: 6 },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lightGray },
  stageDotActive: { backgroundColor: Colors.primary, opacity: 0.4 },
  stageDotCurrent: { opacity: 1, width: 16 },
  stageLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  stageSubtitle: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.lightGray, backgroundColor: Colors.white },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  nextButton: { minWidth: 140 },

  // Shared content
  stageContent: { flex: 1 },
  stageIntro: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 24, marginBottom: Spacing.lg },
  promptQuestion: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.xs },
  multilineInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.white, minHeight: 90, textAlignVertical: 'top', marginBottom: Spacing.sm },
  singleLineInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.white, marginBottom: Spacing.sm },
  hintText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textAlign: 'center', marginBottom: Spacing.md },
  requiredBadge: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary, marginBottom: Spacing.sm },
  optionalBadge: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginBottom: Spacing.sm },

  // Stage 2: Mindfulness
  mindfulnessCard: { backgroundColor: Colors.primary + '08', borderRadius: BorderRadius.md, borderLeftWidth: 3, borderLeftColor: Colors.primary, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginTop: Spacing.md },
  mindfulnessCardText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 22 },
  timerCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxl },
  timerLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, textAlign: 'center', marginBottom: Spacing.xl },
  timerRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  timerDisplay: { fontFamily: Fonts.primaryBold, fontSize: 48, color: Colors.primary },
  timerSubtext: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textAlign: 'center' },

  // Stage 4: Goal / Date
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  dateSelectorText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark },
  datePresets: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  presetChip: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  presetChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  presetChipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  presetChipTextActive: { color: Colors.primary },

  // Stage 5: Action Type Picker
  actionCard: { borderWidth: 2, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.white },
  actionCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '05' },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  actionCardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionCardTitle: { flex: 1 },
  actionCardName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  actionCardType: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', letterSpacing: 1 },
  actionCardDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, marginBottom: Spacing.sm },
  actionCardExamples: { gap: 4 },
  actionCardExample: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 20 },

  // Stage 6: Challenge difficulty
  difficultyRow: { gap: Spacing.xs, marginTop: Spacing.sm },
  difficultyChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', marginBottom: Spacing.xs },
  difficultyChipActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '10' },
  difficultyChipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  difficultyChipTextActive: { color: Colors.secondary },

  // Stage 6: Habit
  freqRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  freqChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  freqChipActive: { backgroundColor: Colors.primary },
  freqChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.primary },
  freqChipTextActive: { color: Colors.white },
  freqLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: Spacing.xs },
  categoryRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  categoryChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border },
  categoryChipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },

  // Stage 7: Reward Messages
  messageChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 2, borderColor: 'transparent', marginBottom: Spacing.sm },
  messageChipSelected: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary },
  messageChipText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, opacity: 0.8, lineHeight: 20 },
  messageChipTextSelected: { opacity: 1, fontFamily: Fonts.secondaryBold },
});
