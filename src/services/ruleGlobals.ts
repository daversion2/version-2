/**
 * Client-side resolution of global rule placeholders ({tidbit}, {mantra},
 * {why_statement}, ...) for in-app surfaces. Mirrors the policy of the
 * Cloud Functions resolver in functions/src/index.ts: if any referenced
 * placeholder can't be resolved for the user, the rule doesn't surface.
 */
import { Rule } from '../types/rules';
import {
  POOL_PLACEHOLDER_KEYS,
  referencedGlobalKeys,
  renderTemplate,
  resolveUserGlobals,
} from './rulesEngine';
import { getAllActiveTidbits } from './neuroscienceTidbits';
import { getAllFunFacts } from './funFacts';
import { getRandomRewardMessage } from './rewardMessages';
import { getRandomProofPoint } from './proofPoints';

const pickRandom = <T>(arr: T[]): T | null =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

/**
 * Returns a copy of the rule with its content fully rendered for this user,
 * or null when a referenced global placeholder has no value (per policy the
 * surface should then not show). In-app surfaces get untruncated content.
 */
export const resolveRuleContent = async (
  rule: Rule,
  userId: string,
  userProfile: Record<string, any>
): Promise<Rule | null> => {
  const keys = referencedGlobalKeys(rule.content);
  if (keys.length === 0) return rule;

  const { vars, missing } = resolveUserGlobals(
    keys.filter((k) => !POOL_PLACEHOLDER_KEYS.includes(k)),
    userProfile
  );
  if (missing.length > 0) return null;

  for (const key of keys.filter((k) => POOL_PLACEHOLDER_KEYS.includes(k))) {
    let value: string | null = null;
    try {
      if (key === 'tidbit') value = pickRandom(await getAllActiveTidbits())?.text ?? null;
      else if (key === 'fun_fact') value = pickRandom(await getAllFunFacts())?.fact ?? null;
      else if (key === 'reward_message') value = (await getRandomRewardMessage())?.text ?? null;
      else if (key === 'proof_point')
        value = (await getRandomProofPoint(userId))?.what_you_did ?? null;
    } catch (err) {
      console.warn(`Failed to resolve {${key}}:`, err);
      value = null;
    }
    if (!value || !value.trim()) return null;
    vars[key] = value;
  }

  return {
    ...rule,
    content: {
      ...rule.content,
      title: renderTemplate(rule.content.title, vars),
      body: renderTemplate(rule.content.body, vars),
    },
  };
};
