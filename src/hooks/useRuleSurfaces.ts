import { useCallback, useEffect, useRef, useState } from 'react';
import * as Localization from 'expo-localization';
import { useAuth } from '../context/AuthContext';
import { Rule, RuleEvent } from '../types/rules';
import { buildUserFacts } from '../services/rulesEngine';
import { evaluateRulesForUser, markRuleShown } from '../services/rules';
import { resolveRuleContent } from '../services/ruleGlobals';
import { getTodayString } from '../utils/date';

/**
 * Client evaluation point for rule-driven in-app surfaces (modals/banners).
 *
 * Evaluates once per mount (and again on a new `day`) when the user profile is
 * available and `ready`, and returns
 * the highest-priority matching modal and banner rules. Fires are recorded
 * to ruleState when the surface is actually shown, so frequency caps work
 * the same as for pushes.
 *
 * `holdModal` keeps the rule modal off-screen while it's true (e.g. while a
 * bespoke modal is visible) — it shows after a short delay once released.
 *
 * `ready` holds evaluation until the caller says the profile is current. Today
 * passes false until its first activity sync has run: the stored
 * lastActivityDate lags behind unrated sessions and meals, and a profile read
 * before that sync would greet an active user with "you've been away".
 *
 * `day` re-evaluates when it changes — the app left open overnight and
 * brought back the next morning is a new app open.
 */
export const useRuleSurfaces = (
  event: RuleEvent,
  holdModal: boolean,
  { ready = true, day }: { ready?: boolean; day?: string } = {}
) => {
  const { user, userProfile } = useAuth();
  // The day last evaluated; null = not yet.
  const evaluatedRef = useRef<string | null>(null);
  const modalRecordedRef = useRef(false);
  const [modalRule, setModalRule] = useState<Rule | null>(null);
  const [bannerRule, setBannerRule] = useState<Rule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const key = day ?? 'once';
    if (evaluatedRef.current === key || !ready || !user || !userProfile) return;
    const isRepeat = evaluatedRef.current !== null;
    evaluatedRef.current = key;
    if (isRepeat) {
      // A new day: last day's modal may fire again, under its own frequency cap.
      modalRecordedRef.current = false;
    }
    (async () => {
      try {
        // active_habit_count now comes from the user doc (apps_active), so
        // there's nothing extra to read.
        const facts = buildUserFacts(
          userProfile as unknown as Record<string, any>,
          getTodayString(),
          new Date().getHours(),
          {},
          Localization.getCalendars()[0]?.timeZone ?? undefined
        );
        const rules = await evaluateRulesForUser(user.uid, event, facts);
        const profile = userProfile as unknown as Record<string, any>;

        // Highest-priority rule whose global placeholders all resolve; a
        // rule referencing e.g. {why_statement} the user doesn't have is
        // skipped in favor of the next match.
        let modal: Rule | null = null;
        for (const r of rules.filter((r) => r.surface === 'modal')) {
          modal = await resolveRuleContent(r, user.uid, profile);
          if (modal) break;
        }
        let banner: Rule | null = null;
        for (const r of rules.filter((r) => r.surface === 'banner')) {
          banner = await resolveRuleContent(r, user.uid, profile);
          if (banner) break;
        }

        setModalRule(modal);
        setBannerRule(banner);
        if (banner) markRuleShown(user.uid, banner.id).catch(() => {});
      } catch (err) {
        console.warn('Rule surface evaluation failed:', err);
      }
    })();
  }, [user, userProfile, event, ready, day]);

  // Show the modal once nothing else is on screen; record the fire then.
  useEffect(() => {
    if (!modalRule || holdModal || modalVisible || modalRecordedRef.current) return;
    const timer = setTimeout(() => {
      setModalVisible(true);
      if (user) {
        modalRecordedRef.current = true;
        markRuleShown(user.uid, modalRule.id).catch(() => {});
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [modalRule, holdModal, modalVisible, user]);

  const dismissModal = useCallback(() => setModalVisible(false), []);
  const dismissBanner = useCallback(() => setBannerRule(null), []);

  return { modalRule, modalVisible, dismissModal, bannerRule, dismissBanner };
};
