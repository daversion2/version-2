import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WorksheetTemplate } from '../../types';

interface WorksheetTemplateCardProps {
  template: WorksheetTemplate;
  onPress: () => void;
}

export const WorksheetTemplateCard: React.FC<WorksheetTemplateCardProps> = ({
  template,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.iconContainer, { backgroundColor: template.color + '20' }]}>
          <Ionicons
            name={template.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={template.color}
          />
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {template.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {template.short_description}
        </Text>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <View style={styles.difficultyDots}>
              {[1, 2, 3].map((d) => (
                <View
                  key={d}
                  style={[
                    styles.dot,
                    d <= template.difficulty && { backgroundColor: template.color },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.time}>
              ~{template.estimated_minutes} min
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: '48%',
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.sm,
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  difficultyDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  time: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});
