import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ViewToken } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { CRAVING_FACTS } from '../../data/cravings';

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const LearnActivity: React.FC = () => {
  const facts = useMemo(() => shuffled(CRAVING_FACTS), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setCurrentIndex(viewableItems[0].index ?? 0);
    },
    []
  );

  return (
    <View
      style={styles.container}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <FlatList
          data={facts}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => (
            <View style={[styles.card, { width: containerWidth }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.kicker}>{item.kicker.toUpperCase()}</Text>
                <Text style={styles.counter}>{index + 1} / {facts.length}</Text>
              </View>
              <Text style={styles.fact}>{item.fact}</Text>
              {index === 0 && (
                <Text style={styles.swipeHint}>swipe for more →</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  kicker: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: '#7AB8C0',
    letterSpacing: 1.5,
  },
  counter: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  fact: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
  },
  swipeHint: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    marginTop: Spacing.lg,
  },
});
