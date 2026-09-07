/**
 * One-off: DISABLE the live "Journey day 3" rule, and leave its content correct
 * in case it is ever switched back on.
 *
 * WHY DISABLE. The rule's job was to get the user to set a weekly target a few
 * days in. Onboarding now sets a schedule at adoption, so by day 3 every habit
 * already has one and the prompt asks for something already done. Parked rather
 * than deleted — day 3 is the most valuable slot in the journey sequence and is
 * worth revisiting with a message that is actually true.
 *
 * WHY ALSO FIX THE CONTENT. Disabling alone would leave a rule that ships the
 * old copy and a dead cta_target the moment anyone re-enables it. The content is
 * brought in line with src/services/rules.ts so re-enabling is a one-switch
 * decision rather than a trap.
 *
 * WHY A SCRIPT. seedDefaultRules matches on `name` and SKIPS rules that already
 * exist, so editing the seed never reaches a rule that has already shipped. The
 * live doc still carries the pre-2026-09-06 copy and a cta_target pointing at
 * `ManageHabits`, a screen archived in 4cccb9a. RETIRED_CTA_SCREENS makes that
 * harmless at runtime — the button dismisses instead of navigating nowhere —
 * but the modal still reads "Set a weekly goal".
 *
 * NOT fixable through the admin editor without a trick. AdminRuleEditScreen
 * loads `cta_target.screen` into state and renders a ChipRow from
 * CTA_SCREEN_TARGETS. 'ManageHabits' is no longer in that list, so NO chip
 * appears selected while the state still holds it — and saving writes the dead
 * target straight back. The target type has to be switched to "None" by hand.
 *
 * Auth: reuses the Firebase CLI's logged-in user via its configstore refresh
 * token, same as scripts/fixComebackRule.js. Run `firebase login` if stale.
 *
 * Usage:
 *   node scripts/fixJourneyDay3Rule.js            # read-only: print the live doc
 *   node scripts/fixJourneyDay3Rule.js --apply    # write the fix
 *
 * Idempotent: re-running after a successful apply reports "already fixed".
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

const PROJECT_ID = 'version-2-4afa1';

// Matched on `name` because the doc id is auto-generated. This name is FROZEN
// in the seed for the same reason — renaming it would seed a second day-3 rule
// beside the live one.
const RULE_NAME = 'Journey day 3: set a weekly goal';

// Source of truth: DEFAULT_RULES in src/services/rules.ts. Kept literal here
// because that module is TypeScript and pulls in the web SDK, which a plain
// node script cannot require. If you change one, change the other.
const NEW_CONTENT = {
  title: 'Three days in',
  body:
    'The schedule you set when you started is a promise, not a score to hit — falling short of it still counts as showing up. Open any habit to change what you committed to.',
  cta: 'Got it',
};

const NEW_DESCRIPTION =
  'PARKED 2026-09-06 (enabled: false). Onboarding now sets a schedule at adoption, so a day-3 prompt to set a weekly target asks for something already done. Kept rather than deleted — day 3 is the most valuable slot in the journey sequence and deserves a message that is actually true. Content and cta_target were cleaned up first so re-enabling is a one-switch decision.';

// firebase-tools' public OAuth client (embedded in the CLI source).
const CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const APPLY = process.argv.includes('--apply');

function authenticate() {
  const configstorePath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
  const refreshToken = config.tokens && config.tokens.refresh_token;
  if (!refreshToken) {
    throw new Error('No refresh token in firebase-tools configstore — run `firebase login` first.');
  }

  // The Firestore client rejects credential.refreshToken() but accepts the same
  // credential through the ADC path, so stage it as an authorized_user file
  // (the format `gcloud auth application-default login` writes).
  const adcPath = path.join(os.tmpdir(), 'neuro-nudge-adc.json');
  fs.writeFileSync(
    adcPath,
    JSON.stringify({
      type: 'authorized_user',
      client_id: CLI_CLIENT_ID,
      client_secret: CLI_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
    { mode: 0o600 }
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
}

async function main() {
  authenticate();

  const db = admin.firestore();
  const snap = await db.collection('rules').where('name', '==', RULE_NAME).get();

  if (snap.empty) {
    console.log(`No rule named "${RULE_NAME}" found.`);
    console.log('Nothing to fix — the live rules may already have been reseeded.');
    return;
  }

  console.log(`Found ${snap.size} matching rule doc(s).\n`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const content = data.content || {};

    console.log(`--- rules/${doc.id} ---`);
    console.log(`  enabled:     ${data.enabled}`);
    console.log(`  surface:     ${data.surface}   event: ${data.event}`);
    console.log(`  title:       ${JSON.stringify(content.title)}`);
    console.log(`  body:        ${JSON.stringify(content.body)}`);
    console.log(`  cta:         ${JSON.stringify(content.cta)}`);
    console.log(`  cta_target:  ${JSON.stringify(content.cta_target)}`);

    const alreadyDone =
      data.enabled === false && content.title === NEW_CONTENT.title && !content.cta_target;
    if (alreadyDone) {
      console.log('  → already disabled and cleaned up, skipping.\n');
      continue;
    }

    if (!APPLY) {
      console.log('\n  WOULD WRITE:');
      console.log('    enabled:    false        <- parked; revisit later');
      console.log(`    title:      ${JSON.stringify(NEW_CONTENT.title)}`);
      console.log(`    body:       ${JSON.stringify(NEW_CONTENT.body)}`);
      console.log(`    cta:        ${JSON.stringify(NEW_CONTENT.cta)}`);
      console.log('    cta_target: <deleted>');
      console.log('\n  Dry run — nothing written. Re-run with --apply to write.\n');
      continue;
    }

    // Dot paths so anything else living under `content` is preserved rather
    // than replaced wholesale.
    await doc.ref.update({
      enabled: false,
      'content.title': NEW_CONTENT.title,
      'content.body': NEW_CONTENT.body,
      'content.cta': NEW_CONTENT.cta,
      'content.cta_target': admin.firestore.FieldValue.delete(),
      description: NEW_DESCRIPTION,
      updated_at: new Date().toISOString(),
    });
    console.log('  → disabled and content cleaned up.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err.message || err);
    process.exit(1);
  });
