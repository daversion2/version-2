/**
 * One-off: add a `days_since_last_activity >= 2` condition to the live
 * "Comeback check-in" rule doc so it stops firing for brand-new users who
 * just finished onboarding (their streak is 0, which alone matched the rule).
 *
 * Auth: reuses the Firebase CLI's logged-in user via its configstore refresh
 * token (the rules/ collection is admin-only writable, so the Web SDK seed
 * pattern used by the other scripts here can't write it). Run `firebase login`
 * first if the CLI session is stale.
 *
 * Usage: node scripts/fixComebackRule.js
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

const PROJECT_ID = 'version-2-4afa1';
const RULE_NAME = 'Comeback check-in';

// firebase-tools' public OAuth client (embedded in the CLI source).
const CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const NEW_CONDITIONS = [
  { fact: 'current_streak', op: '==', value: 0 },
  { fact: 'active_habit_count', op: '>=', value: 1 },
  { fact: 'days_since_last_activity', op: '>=', value: 2 },
];

async function main() {
  const configstorePath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
  const refreshToken = config.tokens && config.tokens.refresh_token;
  if (!refreshToken) {
    throw new Error('No refresh token in firebase-tools configstore — run `firebase login` first.');
  }

  // The Firestore client rejects credential.refreshToken() but accepts the
  // same credential through the ADC path, so stage it as an authorized_user
  // file (the format `gcloud auth application-default login` writes).
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

  const db = admin.firestore();
  const snap = await db.collection('rules').where('name', '==', RULE_NAME).get();
  if (snap.empty) {
    console.log(`No "${RULE_NAME}" rule doc found — nothing to update.`);
    return;
  }

  for (const doc of snap.docs) {
    const current = doc.data().conditions || [];
    console.log(`rules/${doc.id} current conditions:`, JSON.stringify(current));
    const alreadyFixed = current.some((c) => c.fact === 'days_since_last_activity');
    if (alreadyFixed) {
      console.log(`rules/${doc.id} already has a days_since_last_activity condition — skipping.`);
      continue;
    }
    await doc.ref.update({
      conditions: NEW_CONDITIONS,
      updated_at: new Date().toISOString(),
    });
    console.log(`rules/${doc.id} updated conditions:`, JSON.stringify(NEW_CONDITIONS));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err.message || err);
    process.exit(1);
  });
