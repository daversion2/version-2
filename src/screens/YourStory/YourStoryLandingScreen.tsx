import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getProofPointCount } from '../../services/proofPoints';
import { WorksheetsScreenProps } from '../../types/navigation';

const ACCENT = '#8B6F47'; // Warm brown for narrative identity

type Props = WorksheetsScreenProps<'YourStoryLanding'>;

export const YourStoryLandingScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  // Animations
  const iconScale = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(12)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(12)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;
  const counterFade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getProofPointCount(user.uid).then(setCount).catch(() => {});
    }, [user])
  );

  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
      delay: 100,
    }).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(subtitleFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(subtitleSlide, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, friction: 12, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(650),
      Animated.timing(counterFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}
        >
          <Ionicons name="book" size={36} color={ACCENT} />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            { opacity: titleFade, transform: [{ translateY: titleSlide }] },
          ]}
        >
          your story
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: subtitleFade, transform: [{ translateY: subtitleSlide }] },
          ]}
        >
          Your past is proof. Your brain just needs reminding.
        </Animated.Text>

        {/* Theory tag */}
        <Animated.View
          style={[
            styles.tagRow,
            { opacity: subtitleFade, transform: [{ translateY: subtitleSlide }] },
          ]}
        >
          <View style={styles.tag}>
            <Ionicons name="flask-outline" size={12} color={ACCENT} />
            <Text style={styles.tagText}>narrative identity theory</Text>
          </View>
        </Animated.View>

        {/* What this does */}
        <Animated.View
          style={[
            styles.whatCard,
            { opacity: cardFade, transform: [{ translateY: cardSlide }] },
          ]}
        >
          <Text style={styles.whatLabel}>WHAT THIS DOES</Text>
          <Text style={styles.whatText}>
            This tool maps the hard things you've survived into fuel for when you want to quit. You'll build a collection of "proof points" — moments that prove you're tougher than your brain thinks.
          </Text>
          <Text style={[styles.whatText, { marginTop: Spacing.sm }]}>
            When life knocks you down, we'll surface your own evidence that you've been here before — and survived.
          </Text>
        </Animated.View>

        {/* Proof points counter */}
        <Animated.View style={[styles.counterSection, { opacity: counterFade }]}>
          <Text style={styles.counterLabel}>YOUR PROOF POINTS</Text>
          <View style={styles.counterRow}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterNumber}>{count}</Text>
            </View>
            <Text style={styles.counterText}>
              {count === 1 ? 'entry' : 'entries'} logged
            </Text>
          </View>

          {count > 0 && (
            <TouchableOpacity
              style={styles.viewLibraryButton}
              onPress={() => navigation.navigate('ProofPointLibrary')}
              activeOpacity={0.7}
            >
              <Ionicons name="library-outline" size={16} color={ACCENT} />
              <Text style={styles.viewLibraryText}>view your story</Text>
              <Ionicons name="chevron-forward" size={14} color={ACCENT} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProofPoint')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addButtonText}>add a proof point</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() =>
            count > 0
              ? navigation.navigate('ProofPointLibrary')
              : navigation.navigate('AddProofPoint')
          }
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>
            {count > 0 ? 'view your story' : 'start building your story'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: ACCENT + '12',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: ACCENT,
  },
  whatCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  whatLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  whatText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  counterSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  counterLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  counterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: ACCENT,
  },
  counterText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  viewLibraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  viewLibraryText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: ACCENT,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  addButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.lightGray,
  },
  ctaButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
