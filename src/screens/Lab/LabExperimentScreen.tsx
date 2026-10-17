import React, { useLayoutEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { AdminScreenProps } from '../../types/navigation';
import { findLabExperiment } from './experiments';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const LabError: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <View style={styles.centered}>
    <Text style={styles.errorTitle}>{title}</Text>
    <Text style={styles.errorBody}>{message}</Text>
  </View>
);

/**
 * Catches a render crash inside an experiment and shows it here, so a broken
 * experiment costs a back-tap rather than the whole app.
 */
class ExperimentBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error('Lab experiment crashed:', error);
  }

  render() {
    if (this.state.error !== null) {
      return <LabError title="This experiment crashed" message={errorMessage(this.state.error)} />;
    }
    return this.props.children;
  }
}

/** Hosts a standalone Lab experiment (one with a `screen` in ./experiments.ts). */
export const LabExperimentScreen: React.FC<AdminScreenProps<'LabExperiment'>> = ({
  route,
  navigation,
}) => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin === true;
  const experiment = findLabExperiment(route.params.experimentId);

  // The experiment's module runs here, on open, not at import. A module that
  // throws while loading lands in the catch instead of crashing the app.
  // Only reachable from the admin-gated Admin card, but a non-admin must never
  // run experiment code, so the gate sits before the load.
  const loaded = useMemo((): { Component: React.ComponentType } | { error: string } => {
    if (!isAdmin) return { error: 'The Lab is only available to admin accounts.' };
    if (!experiment?.screen) return { error: 'No experiment with a screen has this id.' };
    try {
      return { Component: experiment.screen() };
    } catch (error) {
      console.error('Lab experiment failed to load:', error);
      return { error: errorMessage(error) };
    }
  }, [isAdmin, experiment]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: experiment?.title ?? 'Lab' });
  }, [navigation, experiment]);

  if ('error' in loaded) {
    return <LabError title="Couldn't open this experiment" message={loaded.error} />;
  }
  const { Component } = loaded;
  return (
    <ExperimentBoundary>
      <Component />
    </ExperimentBoundary>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.lightGray,
  },
  errorTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
});
