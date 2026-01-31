import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Button } from '../../components/common/Button';

type Props = NativeStackScreenProps<any, 'StartChallenge'>;

export const StartChallengeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start Today's Challenge</Text>
      <Text style={styles.subtitle}>How do you want to proceed?</Text>

      <Button
        title="Create New Challenge"
        onPress={() => navigation.navigate('CreateChallenge')}
        style={styles.btn}
      />

      <Button
        title="Select from Past Challenges"
        onPress={() => navigation.navigate('PastChallenges')}
        variant="outline"
        style={styles.btn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  btn: { marginBottom: Spacing.md },
});
