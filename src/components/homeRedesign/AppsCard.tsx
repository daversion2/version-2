import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../constants/theme';
import { SwipeViews } from '../common/SwipeViews';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import { actionOrder, APPS_VIEWS, TodayAppItem, upNext } from '../../services/appsLayout';

// =============================================================================
// "YOUR APPS" ON TODAY (2026-11-22): four layouts the founder picked, swiped
// between like the week card above, the last one remembered on the phone.
// Icons (a home-screen grid), Cards (two columns with a status line), List
// (roomy rows with an action button) and Up next (a big card for what's next,
// the rest as bubbles). Logic: services/appsLayout.ts. Mockup:
// https://claude.ai/artifact/KPoxHXiUEDC9rVD7DbjBTd (1, 2, 4, 5).
// =============================================================================

type IconName = keyof typeof Ionicons.glyphMap;
const STORE_KEY = 'nn.todayAppsView';
const BROWSE_COLOR = Colors.gray;

export const AppsCard: React.FC<{
  items: TodayAppItem[];
  onOpen: (id: string) => void;
  onBrowse?: () => void;
}> = ({ items, onOpen, onBrowse }) => (
  <View style={styles.section}>
    <Copy id="today.apps.heading" style={styles.heading} accessibilityRole="header">
      {'Your apps'}
    </Copy>
    <SwipeViews
      name="Your apps"
      storageKey={STORE_KEY}
      views={APPS_VIEWS.map((v) => ({
        id: v.id,
        label: v.label,
        render: () =>
          v.id === 'grid' ? (
            <IconGrid items={items} onOpen={onOpen} onBrowse={onBrowse} />
          ) : v.id === 'cards' ? (
            <CardGrid items={items} onOpen={onOpen} onBrowse={onBrowse} />
          ) : v.id === 'rows' ? (
            <RoomyRows items={items} onOpen={onOpen} onBrowse={onBrowse} />
          ) : (
            <UpNext items={items} onOpen={onOpen} onBrowse={onBrowse} />
          ),
      }))}
    />
  </View>
);

type ViewProps = { items: TodayAppItem[]; onOpen: (id: string) => void; onBrowse?: () => void };

const a11y = (i: TodayAppItem) => `${i.title}, ${i.done ? 'done today' : i.note}${i.plan ? ', today’s plan' : ''}`;

const Tile: React.FC<{ color: string; icon: string; size: number; round?: boolean; faded?: boolean }> = ({
  color,
  icon,
  size,
  round,
  faded,
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: round ? size / 2 : size * 0.27,
      backgroundColor: faded ? color + '26' : color,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Ionicons name={icon as IconName} size={size * 0.5} color={faded ? color : Colors.white} />
  </View>
);

const DoneBadge: React.FC<{ border: string }> = ({ border }) => (
  <View style={[styles.doneBadge, { borderColor: border }]}>
    <Ionicons name="checkmark" size={12} color={Colors.white} />
  </View>
);

/** 1 — app icons, four to a row; a check for done today, PLAN for the plan. */
const IconGrid: React.FC<ViewProps> = ({ items, onOpen, onBrowse }) => (
  <View style={[styles.panel, styles.iconGrid]}>
    {items.map((i) => (
      <TouchableOpacity key={i.id} style={styles.iconCell} onPress={() => onOpen(i.id)} accessibilityRole="button" accessibilityLabel={a11y(i)}>
        <View>
          <Tile color={i.color} icon={i.icon} size={58} />
          {i.done ? (
            <View style={styles.badgeSpot}>
              <DoneBadge border={Colors.cardBg} />
            </View>
          ) : i.plan ? (
            <View style={styles.badgeSpot}>
              <Copy id="today.apps.planBadge" style={styles.planBadge}>{'PLAN'}</Copy>
            </View>
          ) : null}
        </View>
        <Text style={styles.iconLabel} numberOfLines={1}>
          {i.short}
        </Text>
      </TouchableOpacity>
    ))}
    {onBrowse ? (
      <TouchableOpacity style={styles.iconCell} onPress={onBrowse} accessibilityRole="button" accessibilityLabel="Browse apps">
        <Tile color={BROWSE_COLOR} icon="apps" size={58} />
        <Copy id="today.apps.browseShort" style={styles.iconLabel}>{'Browse'}</Copy>
      </TouchableOpacity>
    ) : null}
  </View>
);

/** 2 — two-column cards with a status line. */
const CardGrid: React.FC<ViewProps> = ({ items, onOpen, onBrowse }) => (
  <View style={styles.cardGrid}>
    {items.map((i) => (
      <TouchableOpacity key={i.id} style={styles.card} onPress={() => onOpen(i.id)} accessibilityRole="button" accessibilityLabel={a11y(i)}>
        <View style={styles.cardTop}>
          <Tile color={i.color} icon={i.icon} size={40} />
          {i.done ? (
            <View style={styles.doneTag}>
              <Ionicons name="checkmark" size={13} color={Colors.primary} />
              <Copy id="today.apps.doneTag" style={styles.doneText}>{'Done'}</Copy>
            </View>
          ) : i.plan ? (
            <Copy id="today.apps.planTag" style={styles.planTag}>{'PLAN'}</Copy>
          ) : null}
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {i.title}
          </Text>
          <Text style={styles.note} numberOfLines={2}>
            {i.note}
          </Text>
        </View>
      </TouchableOpacity>
    ))}
    {onBrowse ? (
      <TouchableOpacity style={[styles.card, styles.browseCard]} onPress={onBrowse} accessibilityRole="button" accessibilityLabel="Browse apps">
        <Tile color={BROWSE_COLOR} icon="apps" size={40} />
        <View style={styles.cardText}>
          <Copy id="today.apps.browseCard" style={styles.cardTitle}>{'Browse apps'}</Copy>
          <Copy id="today.apps.addAnother" style={styles.note}>{'Add another'}</Copy>
        </View>
      </TouchableOpacity>
    ) : null}
  </View>
);

/** 4 — roomy rows with an action button; the plan first, done ones last. */
const RoomyRows: React.FC<ViewProps> = ({ items, onOpen, onBrowse }) => {
  const t = useCopy();
  return (
  <View style={styles.rows}>
    {actionOrder(items).map((i) => (
      <View key={i.id} style={styles.row}>
        <TouchableOpacity style={styles.rowMain} onPress={() => onOpen(i.id)} accessibilityRole="button" accessibilityLabel={a11y(i)}>
          <Tile color={i.color} icon={i.icon} size={46} />
          <View style={styles.rowText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {i.title}
            </Text>
            <Text style={styles.note} numberOfLines={1}>
              {i.done ? t('today.apps.doneToday', 'Done today') : i.note}
            </Text>
          </View>
        </TouchableOpacity>
        {i.done ? (
          <View style={styles.doneTag}>
            <Ionicons name="checkmark" size={15} color={Colors.primary} />
            <Copy id="today.apps.doneRowTag" style={styles.doneText}>{'Done'}</Copy>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.action, i.plan && styles.actionPrimary]}
            onPress={() => onOpen(i.id)}
            accessibilityRole="button"
            accessibilityLabel={`${i.action}, ${i.title}`}
          >
            <Text style={[styles.actionText, i.plan && styles.actionTextPrimary]}>{i.action}</Text>
          </TouchableOpacity>
        )}
      </View>
    ))}
    {onBrowse ? <BrowseLink onPress={onBrowse} /> : null}
  </View>
  );
};

/** 5 — a big card for what's next, the rest as bubbles. */
const UpNext: React.FC<ViewProps> = ({ items, onOpen, onBrowse }) => {
  const t = useCopy();
  const { next, rest } = upNext(items);
  return (
    <View style={styles.upNext}>
      {next ? (
        <View style={styles.hero}>
          <View style={[styles.heroBand, { backgroundColor: next.color + '1F' }]}>
            <Ionicons name={next.icon as IconName} size={140} color={next.color + '2E'} style={styles.heroMark} />
            <Tile color={next.color} icon={next.icon} size={56} />
            <View style={styles.heroText}>
              <Text style={styles.heroKicker}>{next.plan ? t('today.apps.upNextPlan', 'UP NEXT · TODAY’S PLAN') : t('today.apps.upNext', 'UP NEXT')}</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {next.title}
              </Text>
              <Text style={styles.note} numberOfLines={1}>
                {next.note}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.heroButton} onPress={() => onOpen(next.id)} accessibilityRole="button">
            <Text style={styles.heroButtonText}>
              {next.action} {next.short}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.panel, styles.allDone]}>
          <Ionicons name="checkmark-circle" size={28} color={Colors.primary} />
          <Copy id="today.apps.allDone" style={styles.cardTitle}>{'Everything’s done today. Noted.'}</Copy>
        </View>
      )}
      <View style={[styles.panel, styles.bubbles]}>
        {rest.map((i) => (
          <TouchableOpacity key={i.id} style={styles.bubbleCell} onPress={() => onOpen(i.id)} accessibilityRole="button" accessibilityLabel={a11y(i)}>
            <View>
              <Tile color={i.color} icon={i.icon} size={54} round faded={i.done} />
              {i.done ? (
                <View style={styles.bubbleBadge}>
                  <DoneBadge border={Colors.cardBg} />
                </View>
              ) : null}
            </View>
            <Text style={styles.iconLabel} numberOfLines={1}>
              {i.short}
            </Text>
            <Text style={styles.bubbleNote} numberOfLines={1}>
              {i.done ? t('today.apps.bubbleDone', 'Done') : i.note}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {onBrowse ? <BrowseLink onPress={onBrowse} /> : null}
    </View>
  );
};

const BrowseLink: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity style={styles.browseLink} onPress={onPress} accessibilityRole="button">
    <Ionicons name="apps" size={16} color={Colors.primary} />
    <Copy id="today.apps.browseLink" style={styles.browseText}>{'Browse apps'}</Copy>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  section: { gap: 8 },
  heading: { ...TextStyles.title3, color: Colors.dark, paddingHorizontal: 4 },
  panel: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg },
  note: { ...TextStyles.footnote, color: Colors.label2 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 16, paddingHorizontal: 4, rowGap: 16 },
  iconCell: { width: '25%', alignItems: 'center', gap: 6 },
  iconLabel: { ...TextStyles.caption, fontWeight: '600', color: Colors.dark, maxWidth: '94%', textAlign: 'center' },
  badgeSpot: { position: 'absolute', right: -6, top: -6 },
  doneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadge: {
    ...TextStyles.caption,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
    backgroundColor: Colors.dark,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: { width: '48.5%', backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, padding: 14, gap: 12 },
  browseCard: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.separator },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardText: { gap: 1 },
  cardTitle: { ...TextStyles.headline, color: Colors.dark },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  doneText: { ...TextStyles.footnote, fontWeight: '700', color: Colors.primary },
  planTag: {
    ...TextStyles.caption,
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    backgroundColor: Colors.dark,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  rows: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  rowText: { flex: 1, minWidth: 0 },
  action: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Colors.primary + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: { backgroundColor: Colors.primary },
  actionText: { ...TextStyles.subhead, fontWeight: '700', color: Colors.dark },
  actionTextPrimary: { color: Colors.white },

  upNext: { gap: 10 },
  hero: { backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  heroBand: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.md, overflow: 'hidden' },
  heroMark: { position: 'absolute', right: -24, top: -30 },
  heroText: { flex: 1, gap: 2 },
  heroKicker: { ...TextStyles.caption, fontWeight: '800', letterSpacing: 0.5, color: Colors.label2 },
  heroTitle: { ...TextStyles.title3, color: Colors.dark },
  heroButton: {
    margin: 12,
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: { ...TextStyles.headline, color: Colors.white },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  bubbles: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 14, paddingHorizontal: 4, rowGap: 14 },
  bubbleCell: { width: '25%', alignItems: 'center', gap: 4 },
  bubbleBadge: { position: 'absolute', right: -4, bottom: -4 },
  bubbleNote: { ...TextStyles.caption, color: Colors.gray, maxWidth: '94%', textAlign: 'center' },

  browseLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  browseText: { ...TextStyles.subhead, fontWeight: '600', color: Colors.primary },
});
