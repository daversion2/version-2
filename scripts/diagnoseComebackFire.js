/**
 * READ-ONLY diagnostic: why did the "Comeback check-in" modal fire straight
 * after onboarding?
 *
 * Prints the live rule's conditions and, for the given account, the exact facts
 * rulesEngine.buildFacts would compute — so the match can be checked by hand
 * rather than guessed at.
 *
 * Auth: reuses the Firebase CLI login, same as scripts/fixComebackRule.js.
 *
 * Usage: node scripts/diagnoseComebackFire.js <email>
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

const PROJECT_ID = 'version-2-4afa1';
const EMAIL = process.argv[2];

const CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function authenticate() {
  const configstorePath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
  const refreshToken = config.tokens && config.tokens.refresh_token;
  if (!refreshToken) throw new Error('Run `firebase login` first.');
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
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
}

/** Mirrors utils/date daysBetween(today, then) — whole days between two YYYY-MM-DD. */
const daysBetween = (a, b) =>
  Math.round((Date.parse(`${a}T00:00:00`) - Date.parse(`${b}T00:00:00`)) / 86400000);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function main() {
  authenticate();
  const db = admin.firestore();

  const rules = await db.collection('rules').where('name', '==', 'Comeback check-in').get();
  console.log('=== LIVE RULE ===');
  if (rules.empty) {
    console.log('  no "Comeback check-in" rule found');
  } else {
    rules.docs.forEach((d) => {
      const r = d.data();
      console.log(`  rules/${d.id}  enabled: ${r.enabled}  freq: ${JSON.stringify(r.frequency)}`);
      console.log(`  conditions: ${JSON.stringify(r.conditions)}`);
    });
  }

  if (!EMAIL) {
    console.log('\nPass an email to also dump that account\'s facts.');
    return;
  }

  const users = await db.collection('users').where('email', '==', EMAIL).get();
  console.log(`\n=== ACCOUNT: ${EMAIL} ===`);
  if (users.empty) {
    console.log('  no user doc with that email');
    return;
  }

  for (const doc of users.docs) {
    const u = doc.data();
    const today = todayLocal();
    const signup = u.created_at ? String(u.created_at).slice(0, 10) : undefined;
    // buildFacts falls back to the signup date when there is no activity.
    const lastActivity = u.lastActivityDate || signup;

    const habits = await db.collection('users').doc(doc.id).collection('habits').get();
    const active = habits.docs.filter((h) => h.data().is_active !== false);

    console.log(`  users/${doc.id}`);
    console.log(`    created_at:               ${u.created_at}`);
    console.log(`    has_completed_onboarding: ${u.has_completed_onboarding}`);
    console.log(`    starting_practice_id:     ${u.starting_practice_id}`);
    console.log(`    lastActivityDate:         ${u.lastActivityDate}`);
    console.log(`    currentStreak:            ${u.currentStreak}`);
    console.log(`    totalHabitsCompleted:     ${u.totalHabitsCompleted}`);
    console.log(`    app_open_count:           ${u.app_open_count}`);
    console.log(`    active habits:            ${active.length} of ${habits.size}`);
    // Newest first, ALL of them. A habit created by the new onboarding carries
    // scheduled_days + expected_resistance, so this is what distinguishes
    // "ran the new flow" from "never saw it".
    const byNewest = habits.docs
      .map((h) => ({ id: h.id, ...h.data() }))
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
    byNewest.forEach((h) =>
      console.log(
        `      ${h.is_active === false ? '[archived]' : '[active]  '} ${String(h.name).padEnd(16)} created=${h.created_at ?? '?'} days=${JSON.stringify(h.scheduled_days)} goals=${JSON.stringify(h.metric_goals)} expected=${h.expected_resistance}`
      )
    );

    console.log('\n    FACTS as rulesEngine would compute them:');
    const dsla = lastActivity ? daysBetween(today, lastActivity) : 0;
    const streakAlive = u.lastActivityDate && daysBetween(today, u.lastActivityDate) <= 1;
    console.log(`      days_since_last_activity: ${dsla}   (from ${u.lastActivityDate ? 'lastActivityDate' : 'created_at fallback'} ${lastActivity})`);
    console.log(`      current_streak:           ${streakAlive ? u.currentStreak || 0 : 0}`);
    console.log(`      active_habit_count:       ${active.length}`);
    console.log(`      days_since_signup:        ${signup ? daysBetween(today, signup) : 0}`);

    const fires = dsla >= 2 && (streakAlive ? u.currentStreak || 0 : 0) === 0 && active.length >= 1;
    console.log(`\n    → comeback rule matches: ${fires ? 'YES' : 'no'}`);

    const state = await db.collection('users').doc(doc.id).collection('ruleState').get();
    console.log(`    ruleState docs: ${state.size}`);
    state.docs.forEach((s) =>
      console.log(`      ${s.id}: ${JSON.stringify(s.data())}`)
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err.message || err);
    process.exit(1);
  });
