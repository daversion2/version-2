import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../common/Button';
import { FunFact } from '../../types';

interface FunFactModalProps {
  visible: boolean;
  funFact: FunFact | null;
  onClose: () => void;
}

export const FunFactModal: React.FC<FunFactModalProps> = ({
  visible,
  funFact,
  onClose,
}) => {
  const handleShare = async () => {
    if (!funFact) return;

    let message = `Neuroscience Fun Fact: ${funFact.fact}`;
    if (funFact.sourceUrl) {
      message += `\n\nSource: ${funFact.sourceUrl}`;
    }
    message += '\n\n- Shared from NeuroNudge';

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSourcePress = () => {
    if (funFact?.sourceUrl) {
      Linking.openURL(funFact.sourceUrl);
    }
  };

  if (!funFact) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="bulb-outline" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.title}>Neuroscience Fun Fact</Text>
          </View>

          <Text style={styles.factText}>{funFact.fact}</Text>

          {funFact.sourceUrl && (
            <TouchableOpacity style={styles.sourceRow} onPress={handleSourcePress}>
              <Ionicons name="link-outline" size={16} color={Colors.primary} />
              <Text style={styles.sourceText} numberOfLines={1}>
                {funFact.sourceTitle || 'View Source'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={Colors.primary} />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
            <Button title="Close" onPress={onClose} style={styles.closeButton} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
  },
  factText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sourceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  shareText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  closeButton: {
    flex: 1,
  },
});
