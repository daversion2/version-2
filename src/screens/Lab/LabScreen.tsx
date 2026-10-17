import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { isLabExperimentOn, setLabExperiment } from '../../services/lab';
import { AdminNavigation } from '../../types/navigation';
import { ALL_LAB_EXPERIMENTS } from './experiments';

/**
 * Admin → Lab. Loaded on first open via getComponent in AdminStack, never at
 * app start. See ./experiments.ts for how to add an experiment.
 */
export const LabScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const { user, userProfile, refreshProfile } = useAuth();
  // Switch positions while a save is in flight, so the switch moves on tap
  // instead of after the Firestore round trip.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Only reachable from the admin-gated Admin card, but cheap to re-check.
  if (userProfile?.is_admin !== true) {
    return (
      <View style={styles.centered}>
        <Text style={styles.desc}>The Lab is only available to admin accounts.</Text>
      </View>
    );
  }

  const switches = ALL_LAB_EXPERIMENTS.filter((e) => !e.screen && !e.open);
  const screens = ALL_LAB_EXPERIMENTS.filter((e) => e.screen || e.open);

  const isOn = (id: string) => pending[id] ?? isLabExperimentOn(userProfile, id);

  const handleToggle = async (id: string, on: boolean) => {
    if (!user) return;
    setPending((p) => ({ ...p, [id]: on }));
    try {
      await setLabExperiment(user.uid, id, on);
      await refreshProfile();
    } catch (error) {
      console.error('Error saving Lab switch:', error);
      Alert.alert('Error', "Couldn't save that switch. Try again.");
    } finally {
      setPending(({ [id]: _done, ...rest }) => rest);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.intro}>
        Experiments only admin accounts can see. Switches change the app for this account only;
        everyone else keeps the current version.
      </Text>

      {ALL_LAB_EXPERIMENTS.length === 0 && (
        <Card style={styles.card}>
          <Text style={styles.label}>No experiments yet</Text>
          <Text style={styles.desc}>Add one in src/screens/Lab/experiments.ts.</Text>
        </Card>
      )}

      {switches.length > 0 && <Text style={styles.sectionTitle}>Switches</Text>}
      {switches.map((e) => (
        <Card key={e.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{e.title}</Text>
              <Text style={styles.desc}>{e.description}</Text>
            </View>
            <Switch
              value={isOn(e.id)}
              onValueChange={(on) => handleToggle(e.id, on)}
              disabled={e.id in pending}
              trackColor={{ true: Colors.secondary }}
            />
          </View>
        </Card>
      ))}

      {screens.length > 0 && <Text style={styles.sectionTitle}>Screens</Text>}
      {screens.map((e) => (
        <Card
          key={e.id}
          style={styles.card}
          onPress={() =>
            e.open ? e.open(navigation) : navigation.navigate('LabExperiment', { experimentId: e.id })
          }
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{e.title}</Text>
              <Text style={styles.desc}>{e.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.lightGray,
  },
  intro: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  card: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowText: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  desc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 16,
    marginTop: 2,
  },
});
