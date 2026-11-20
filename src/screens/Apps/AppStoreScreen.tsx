import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../../constants/theme';
import { LargeTitle } from '../../components/common/LargeTitle';
import { useAuth } from '../../context/AuthContext';
import type { CatalogApp } from '../../data/appCatalog';
import { addAppToToday, catalogSections, catalogStatus, goalLine } from '../../services/appCatalog';
import { AppSetup, loadAppSetup } from '../../services/appSetup';
import { triggerTapHaptic } from '../../utils/haptics';
import { showAlert } from '../../utils/alert';
import type { RootStackParamList } from '../../types/navigation';
import { AppRow, FeaturedCard, Panel, PillButton } from './AppStoreParts';

// =============================================================================
// APPS — browse every app and add one to Today (2026-11-20, admin-only).
//
// Featured cards at the top (new apps, then ones not on Today yet), then what's
// on your Today, what you can add, and the apps that open on their own. "Add"
// adds at the goal already saved for that app; the app's own page
// (AppStoreDetailScreen) is where the goal is picked. Content:
// data/appCatalog.ts. Logic: services/appCatalog.ts.
// =============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'AppStore'>;

export const AppStoreScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, userProfile, refreshProfile } = useAuth();
  const [setup, setSetup] = useState<AppSetup | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    loadAppSetup(user.uid, userProfile)
      .then(setSetup)
      .catch((e) => console.warn('Apps: loading setup failed', e));
  }, [user, userProfile]);

  useFocusEffect(load);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const open = (app: CatalogApp) => navigation.navigate('AppStoreDetail', { appId: app.id });

  const quickAdd = async (app: CatalogApp) => {
    if (!user || !setup || !app.todayAppId || adding) return;
    setAdding(app.id);
    try {
      await addAppToToday(user.uid, userProfile, app.todayAppId, setup.goals[app.todayAppId]);
      triggerTapHaptic();
      await refreshProfile();
      load();
      setNotice(`${app.name} is on Today.`);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 2600);
    } catch (e: any) {
      showAlert('Couldn’t add it', e?.message ?? 'Please try again.');
    } finally {
      setAdding(null);
    }
  };

  const launch = (app: CatalogApp) => {
    if (app.route) navigation.navigate(app.route);
  };

  const actionFor = (app: CatalogApp) => {
    const status = catalogStatus(app, setup?.hidden ?? []);
    if (status === 'onToday') {
      return <PillButton kind="done" label="On Today" accessibilityLabel={`${app.name} is on Today`} />;
    }
    if (status === 'addable') {
      return (
        <PillButton
          kind="filled"
          label="Add"
          busy={adding === app.id}
          onPress={() => quickAdd(app)}
          accessibilityLabel={`Add ${app.name} to Today`}
        />
      );
    }
    return <PillButton kind="outline" label="Open" onPress={() => launch(app)} accessibilityLabel={`Open ${app.name}`} />;
  };

  const sections = setup ? catalogSections(setup.hidden) : null;
  const cardWidth = Math.min(width - Spacing.md * 2 - 28, 360);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <LargeTitle title="Apps" eyebrow="Train the override" back={{ label: 'Back', onPress: () => navigation.goBack() }} />
        <Text style={styles.intro}>
          Each app trains the same override somewhere new. Start with one, add another when you want more.
        </Text>

        {!sections ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : (
          <>
            {sections.featured.length > 0 && (
              <View style={styles.featuredWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={cardWidth + 12}
                  decelerationRate="fast"
                  contentContainerStyle={styles.featuredRow}
                >
                  {sections.featured.map((app) => (
                    <FeaturedCard
                      key={app.id}
                      app={app}
                      width={cardWidth}
                      badge={app.isNew ? 'New' : 'Not on Today yet'}
                      action={actionFor(app)}
                      onPress={() => open(app)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {sections.onToday.length > 0 && (
              <Panel title="On your Today">
                {sections.onToday.map((app, i) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    subtitle={app.todayAppId ? `${app.tagline} · ${goalLine(setup!.goals[app.todayAppId])}` : undefined}
                    action={actionFor(app)}
                    onPress={() => open(app)}
                    separator={i < sections.onToday.length - 1}
                  />
                ))}
              </Panel>
            )}

            {sections.addable.length > 0 && (
              <Panel title="Add to Today" footer="Adds its ring, its page and a weekly goal to Today.">
                {sections.addable.map((app, i) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    action={actionFor(app)}
                    onPress={() => open(app)}
                    separator={i < sections.addable.length - 1}
                  />
                ))}
              </Panel>
            )}

            {sections.standalone.length > 0 && (
              <Panel
                title="New, on their own for now"
                footer="These open on their own. Joining Today’s rings and ratings is coming next."
              >
                {sections.standalone.map((app, i) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    action={actionFor(app)}
                    onPress={() => open(app)}
                    separator={i < sections.standalone.length - 1}
                  />
                ))}
              </Panel>
            )}

            <Text style={styles.footnote}>Remove an app from its own page. Its history always stays.</Text>
          </>
        )}
      </ScrollView>

      {notice ? (
        <View
          style={[styles.notice, { bottom: insets.bottom + Spacing.md }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  intro: { ...TextStyles.callout, color: Colors.label2, paddingHorizontal: 4, marginTop: -Spacing.sm },
  loading: { marginTop: Spacing.xl },
  featuredWrap: { marginHorizontal: -Spacing.md },
  featuredRow: { paddingHorizontal: Spacing.md, gap: 12 },
  footnote: { ...TextStyles.footnote, color: Colors.gray, textAlign: 'center', paddingHorizontal: Spacing.lg },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: Colors.dark,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  noticeText: { ...TextStyles.subhead, fontWeight: '600', color: Colors.white },
});
