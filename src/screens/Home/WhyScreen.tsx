import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WHY_REFLECTION_PROMPTS } from '../../constants/whyDiscovery';
import { useAuth } from '../../context/AuthContext';
import {
  getWhyProfile,
  updateWhyStatement,
  saveWhyReflection,
} from '../../services/whyDiscovery';
import { getActiveGoals } from '../../services/goals';
import { WhyProfile, Goal } from '../../types';
import { WhyStatementCard } from '../../components/why/WhyStatementCard';
import { StoryCard } from '../../components/why/StoryCard';
import { WhyChain } from '../../components/why/WhyChain';
import { ThemeChip } from '../../components/why/ThemeChip';

type Props = NativeStackScreenProps<any>;

export const WhyScreen: React.FC<Props> = ({ navigation }) => {
  const { user, refreshProfile } = useAuth();
  const [whyProfile, setWhyProfile] = useState<WhyProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editContribution, setEditContribution] = useState('');
  const [editImpact, setEditImpact] = useState('');

  // Reflection
  const reflectionPrompt = WHY_REFLECTION_PROMPTS[
    Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % WHY_REFLECTION_PROMPTS.length
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profile, activeGoals] = await Promise.all([
        getWhyProfile(user.uid),
        getActiveGoals(user.uid),
      ]);
      setWhyProfile(profile);
      setGoals(activeGoals);
      if (profile) {
        setEditContribution(profile.contribution_part || '');
        setEditImpact(profile.impact_part || '');
      }
    } catch (e) {
      console.warn('Failed to load Why profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!user || !editContribution.trim() || !editImpact.trim()) {
      Alert.alert('Required', 'Please fill in both parts of your Why statement.');
      return;
    }
    const newStatement = `To ${editContribution.trim()} so that ${editImpact.trim()}`;
    try {
      await updateWhyStatement(user.uid, newStatement, editContribution.trim(), editImpact.trim());
      await refreshProfile();
      setWhyProfile(prev => prev ? { ...prev, why_statement: newStatement, contribution_part: editContribution.trim(), impact_part: editImpact.trim() } : prev);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save.');
    }
  };

  const handleReflect = async () => {
    if (!user) return;
    try {
      await saveWhyReflection(user.uid);
      Alert.alert('Reflected', 'Keep coming back to your Why. It grows with you.');
    } catch (e) {
      console.warn('Failed to save reflection:', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!whyProfile || whyProfile.status !== 'completed') {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="compass-outline" size={48} color={Colors.primary} />
        <Text style={styles.emptyTitle}>Your Why Awaits</Text>
        <Text style={styles.emptyBody}>
          Complete the Why Discovery flow to see your purpose here.
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('WhyDiscoveryFlow')}
        >
          <Text style={styles.startButtonText}>Start Discovery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Why Statement */}
      {!editing ? (
        <WhyStatementCard
          statement={whyProfile.why_statement}
          onEdit={() => setEditing(true)}
        />
      ) : (
        <View style={styles.editSection}>
          <Text style={styles.editLabel}>To:</Text>
          <TextInput
            style={styles.editInput}
            value={editContribution}
            onChangeText={setEditContribution}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.editLabel}>So that:</Text>
          <TextInput
            style={styles.editInput}
            value={editImpact}
            onChangeText={setEditImpact}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <View style={styles.editButtonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Themes */}
      {whyProfile.themes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Themes</Text>
          <View style={styles.themeRow}>
            {whyProfile.themes.map(theme => (
              <ThemeChip key={theme.id} text={theme.text} selected disabled />
            ))}
          </View>
        </View>
      )}

      {/* Stories */}
      {whyProfile.stories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stories</Text>
          {whyProfile.stories.map((story, idx) => (
            <StoryCard key={story.id} story={story} index={idx} />
          ))}
        </View>
      )}

      {/* Why Chain */}
      {whyProfile.why_iterations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Why Chain</Text>
          <WhyChain
            iterations={whyProfile.why_iterations}
            coreWhyReached={whyProfile.core_why_reached}
          />
        </View>
      )}

      {/* Goal Connections */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal Connections</Text>
          {goals.map(goal => (
            <View key={goal.id} style={styles.goalCard}>
              <Text style={styles.goalName}>{goal.name}</Text>
              {goal.why_connection ? (
                <Text style={styles.goalConnection}>{goal.why_connection}</Text>
              ) : (
                <Text style={styles.goalNoConnection}>No Why connection yet</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Reflect */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reflect</Text>
        <View style={styles.reflectCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
          <Text style={styles.reflectPrompt}>{reflectionPrompt}</Text>
          <TouchableOpacity style={styles.reflectButton} onPress={handleReflect}>
            <Text style={styles.reflectButtonText}>I've Reflected</Text>
          </TouchableOpacity>
        </View>
        {whyProfile.last_reflected_at && (
          <Text style={styles.lastReflected}>
            Last reflected: {new Date(whyProfile.last_reflected_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  emptyBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  startButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },

  // Edit
  editSection: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  editLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  editInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 50,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },

  // Themes
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // Goals
  goalCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  goalName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: 4,
  },
  goalConnection: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  goalNoConnection: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    opacity: 0.6,
  },

  // Reflect
  reflectCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reflectPrompt: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  reflectButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  reflectButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  lastReflected: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
});
