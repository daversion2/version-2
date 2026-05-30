import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Button } from '../../components/common/Button';

type Props = HomeScreenProps<'StartChallenge'>;

export const StartChallengeScreen: React.FC<Props> = ({ navigation, route }) => {
  const forDate = route.params?.forDate;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start Today's Challenge</Text>
      <Text style={styles.subtitle}>How do you want to proceed?</Text>

      <Button
        title="Create New Challenge"
        onPress={() => navigation.navigate('CreateChallenge', { forDate })}
        style={styles.btn}
      />

      <Button
        title="Select from Past Challenges"
        onPress={() => navigation.navigate('PastChallenges', { forDate })}
        variant="outline"
        style={styles.btn}
      />

      <Button
        title="Browse Challenge Library"
        onPress={() => navigation.navigate('ChallengeLibrary', { forDate })}
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
