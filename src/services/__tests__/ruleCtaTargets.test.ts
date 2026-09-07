import { DEFAULT_RULES } from '../rules';
import {
  CTA_SCREEN_TARGETS,
  CTA_TAB_TARGETS,
  RETIRED_CTA_SCREENS,
  isOfferedCtaScreen,
  resolveEditableCtaTarget,
} from '../../types/rules';

// =============================================================================
// RULE CTA TARGETS — guards the one thing that can rot silently here.
//
// `cta_target.screen` is a plain string, and rules live in Firestore rather
// than in this repo, so nothing at compile time connects a rule to the screen
// it opens. Archiving a screen therefore breaks CTAs with no error anywhere:
// the button just does nothing.
//
// These assert the contract that replaced that silence — a target is either
// routable or explicitly retired, never merely absent.
// =============================================================================

const screenTargets = (): string[] =>
  DEFAULT_RULES.map((rule) => rule.content.cta_target)
    .filter((target): target is { type: 'screen'; screen: string } =>
      target?.type === 'screen' && typeof target.screen === 'string')
    .map((target) => target.screen);

describe('seeded rule CTA targets', () => {
  it('never points at a screen that has been retired', () => {
    // The failure this catches: archiving a screen and leaving a rule aimed at
    // it, which ships a button that silently does nothing.
    screenTargets().forEach((screen) => {
      expect(RETIRED_CTA_SCREENS).not.toContain(screen);
    });
  });

  it('only points at destinations the admin picker also offers', () => {
    // Keeps the seeded rules and the admin UI describing the same set of
    // destinations, so a target can't exist that an admin could never have
    // chosen — or re-choose after editing the rule.
    const offered = new Set(CTA_SCREEN_TARGETS.map((t) => t.value));
    screenTargets().forEach((screen) => {
      expect(offered.has(screen)).toBe(true);
    });
  });
});

describe('the target lists themselves', () => {
  it('never offers a retired screen in the admin picker', () => {
    CTA_SCREEN_TARGETS.forEach((target) => {
      expect(RETIRED_CTA_SCREENS).not.toContain(target.value);
    });
  });

  it('keeps the tab targets routable', () => {
    // 'Tools' is deliberately in both: the tab is hidden, so it is a tab target
    // that must not be followed. Anything else in both lists is a mistake.
    CTA_TAB_TARGETS.filter((tab) => tab !== 'Tools').forEach((tab) => {
      expect(RETIRED_CTA_SCREENS).not.toContain(tab);
    });
  });

  it('has no duplicate destinations', () => {
    const values = CTA_SCREEN_TARGETS.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('resolveEditableCtaTarget', () => {
  it('loads a live screen target unchanged', () => {
    expect(resolveEditableCtaTarget({ type: 'screen', screen: 'Progress' })).toEqual({
      kind: 'screen',
      screen: 'Progress',
    });
  });

  it('loads a url target unchanged', () => {
    expect(resolveEditableCtaTarget({ type: 'url', url: 'https://example.com' })).toEqual({
      kind: 'url',
      url: 'https://example.com',
    });
  });

  it('reads a missing target as none', () => {
    expect(resolveEditableCtaTarget(undefined)).toEqual({ kind: 'none' });
  });

  it('DROPS a screen the picker can no longer offer', () => {
    // The bug this exists to kill: the picker renders from CTA_SCREEN_TARGETS,
    // so a retired value shows no chip selected while the state still holds it.
    // Saving then wrote the dead target straight back, which meant retiring a
    // screen survived every attempt to edit the rule pointing at it.
    expect(resolveEditableCtaTarget({ type: 'screen', screen: 'ManageHabits' })).toEqual({
      kind: 'none',
      droppedRetiredScreen: 'ManageHabits',
    });
  });

  it('reports what was dropped, so the form can say so rather than go quiet', () => {
    const resolved = resolveEditableCtaTarget({ type: 'screen', screen: 'ManageHabits' });
    expect(resolved.droppedRetiredScreen).toBe('ManageHabits');
    expect(resolved.screen).toBeUndefined();
  });

  it('cannot round-trip a retired target back into a rule', () => {
    // Loading then saving must not reproduce the dead target — this is the
    // whole contract, expressed end to end.
    const resolved = resolveEditableCtaTarget({ type: 'screen', screen: 'ManageHabits' });
    const rebuilt =
      resolved.kind === 'screen' ? { type: 'screen' as const, screen: resolved.screen } : undefined;
    expect(rebuilt).toBeUndefined();
  });

  it('drops any retired screen, not just the one that prompted this', () => {
    RETIRED_CTA_SCREENS.forEach((screen) => {
      expect(resolveEditableCtaTarget({ type: 'screen', screen }).kind).toBe('none');
    });
  });

  it('treats a malformed target as none rather than throwing', () => {
    expect(resolveEditableCtaTarget({ type: 'screen' }).kind).toBe('none');
    expect(resolveEditableCtaTarget({ type: 'url' }).kind).toBe('none');
  });
});

describe('isOfferedCtaScreen', () => {
  it('accepts every destination the picker lists', () => {
    CTA_SCREEN_TARGETS.forEach((target) => {
      expect(isOfferedCtaScreen(target.value)).toBe(true);
    });
  });

  it('rejects retired and unknown screens', () => {
    expect(isOfferedCtaScreen('ManageHabits')).toBe(false);
    expect(isOfferedCtaScreen('NoSuchScreen')).toBe(false);
    expect(isOfferedCtaScreen(undefined)).toBe(false);
  });
});
