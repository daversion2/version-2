// End-to-end check of the pod functions + rules against the Firebase emulator.
// Project "demo-pods": demo- projects never touch real Firebase.
const fs = require('fs');
const assert = require('assert');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
// Load firebase/firestore from beside the test library, not the app's own
// node_modules: two copies of the SDK can't share a Firestore instance.
const fromTestLib = require.resolve('firebase/firestore', { paths: [require.resolve('@firebase/rules-unit-testing')] });
const { doc, getDoc, getDocs, collection, updateDoc, setDoc } = require(fromTestLib);

const PROJECT = 'demo-pods';
const AUTH = 'http://127.0.0.1:9099';
const FN = `http://127.0.0.1:5001/${PROJECT}/us-central1`;
const TODAY = new Date().toISOString().slice(0, 10); // members use UTC below

let passed = 0;
const ok = (name) => { passed++; console.log(`  ✓ ${name}`); };

async function signUp(email) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }),
  });
  const j = await r.json();
  return { uid: j.localId, token: j.idToken };
}

async function call(user, name, data = {}) {
  const r = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${user.token}` },
    body: JSON.stringify({ data }),
  });
  const j = await r.json();
  if (j.error) return { error: j.error.status, reason: j.error.details?.reason, message: j.error.message };
  return j.result;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(300); }
  return false;
}

(async () => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync(process.argv[2], 'utf8') },
  });
  await env.clearFirestore();
  const admin = async (fn) => { let out; await env.withSecurityRulesDisabled(async (ctx) => { out = await fn(ctx.firestore()); }); return out; };
  const client = (u) => env.authenticatedContext(u.uid).firestore();

  const [A, B, C, D, E, F] = await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map((x) => signUp(`${x}@test.dev`)));
  // Profiles exist, as they would after sign-up.
  for (const u of [A, B, C, D, E, F]) await admin((db) => setDoc(doc(db, 'users', u.uid), { email: 'x', created_at: 'now' }));
  const join = (u, code, name) => call(u, 'joinPod', { code, firstName: name, timezone: 'UTC', goals: { meditate: 3 } });

  console.log('Starting and joining');
  let r = await call(A, 'createPod', { firstName: 'j0nny', timezone: 'UTC' });
  assert.strictEqual(r.reason, 'bad_name'); ok('refuses a name with digits');
  r = await call(A, 'createPod', { firstName: '  Ana ', timezone: 'UTC', goals: { meditate: 5, workouts: 3 } });
  assert.ok(r.podId && /^[A-Z0-9]{6}$/.test(r.code)); ok('starts a pod and returns a code');
  const podId = r.podId;
  let code = r.code;
  const members = await admin(async (db) => (await getDoc(doc(db, 'pods', podId))).data());
  assert.deepStrictEqual(members.member_ids, [A.uid]); ok('starter is the only member');
  const memberA = await admin(async (db) => (await getDoc(doc(db, 'pods', podId, 'members', A.uid))).data());
  assert.strictEqual(memberA.first_name, 'Ana'); assert.deepStrictEqual(memberA.goals, { meditate: 5, workouts: 3 }); ok('member doc has the cleaned name and goals');

  r = await join(B, `${code.slice(0, 3).toLowerCase()}-${code.slice(3)}`, 'Ben');
  assert.strictEqual(r.podId, podId); ok('joins with a typed code (lower case, dash)');
  r = await join(B, code, 'Ben');
  assert.strictEqual(r.podId, podId); ok('joining again just returns the pod');
  r = await join(C, 'ACDEFG', 'Cy');
  assert.strictEqual(r.reason, 'no_invite'); ok('wrong code: no_invite');
  for (const [u, n] of [[C, 'Cy'], [D, 'Dee'], [E, 'Eve']]) assert.strictEqual((await join(u, code, n)).podId, podId);
  r = await join(F, code, 'Fay');
  assert.strictEqual(r.reason, 'full'); ok('the 6th person is refused: full');
  r = await call(B, 'createPod', { firstName: 'Ben' });
  assert.strictEqual(r.reason, 'in_another_pod'); ok('one pod per person');

  console.log('Security rules');
  const dbB = client(B), dbF = client(F);
  await assertSucceeds(getDoc(doc(dbB, 'pods', podId))); ok('a member reads the pod');
  await assertSucceeds(getDocs(collection(dbB, 'pods', podId, 'members'))); ok('a member lists the members');
  await assertFails(getDoc(doc(dbF, 'pods', podId))); ok('an outsider cannot read the pod');
  await assertFails(getDocs(collection(dbF, 'pods', podId, 'members'))); ok('an outsider cannot list members');
  await assertFails(getDoc(doc(dbF, 'podInvites', code))); ok('nobody reads invites');
  await assertFails(updateDoc(doc(dbB, 'pods', podId), { member_ids: [B.uid] })); ok('a member cannot edit the pod doc');
  await assertFails(updateDoc(doc(dbB, 'pods', podId, 'members', A.uid), { days: {} })); ok("cannot write someone else's member doc");
  await assertFails(updateDoc(doc(dbB, 'pods', podId, 'members', B.uid), { joined_at: 'x' })); ok('cannot touch joined_at');
  await assertFails(updateDoc(doc(dbB, 'pods', podId, 'members', B.uid), { first_name: 'x'.repeat(21) })); ok('cannot set a 21-char name');
  await assertFails(setDoc(doc(dbB, 'users', B.uid), { pod_id: 'other' }, { merge: true })); ok('cannot set own pod_id');
  await assertFails(setDoc(doc(dbB, 'users', B.uid), { pod_push_history: [] }, { merge: true })); ok('cannot reset own pod push budget');
  await assertSucceeds(setDoc(doc(dbB, 'users', B.uid), { pod_muted: true, first_name: 'Ben' }, { merge: true })); ok('can mute pods and set first name');
  await assertFails(setDoc(doc(dbF, 'pods', 'newpod'), { member_ids: [F.uid] })); ok('cannot create a pod directly');

  console.log('Reactions and nudges');
  const sessionA = { id: 'sessA1', app: 'workouts', start: 3, keep: 2 };
  await assertSucceeds(updateDoc(doc(client(A), 'pods', podId, 'members', A.uid), { days: { [TODAY]: [sessionA] }, updated_at: 'now' }));
  ok('a member shares a session');
  r = await call(B, 'sendPodReaction', { kind: 'reaction', to: A.uid, preset: 'hard_one', sessionId: 'sessA1', forDay: TODAY });
  assert.deepStrictEqual(r, { sent: true, pushed: false }); ok('reacts to it (no push token, so no push)');
  r = await call(B, 'sendPodReaction', { kind: 'reaction', to: A.uid, preset: 'proud', sessionId: 'sessA1', forDay: TODAY });
  assert.strictEqual(r.reason, 'already_sent'); ok('one reaction per sender per session');
  r = await call(B, 'sendPodReaction', { kind: 'reaction', to: A.uid, preset: 'whatever', sessionId: 'sessA1', forDay: TODAY });
  assert.strictEqual(r.reason, 'bad_reaction'); ok('only presets');
  r = await call(B, 'sendPodReaction', { kind: 'reaction', to: A.uid, preset: 'proud', sessionId: 'nope', forDay: TODAY });
  assert.strictEqual(r.reason, 'no_session'); ok('needs a real session');
  r = await call(A, 'sendPodReaction', { kind: 'reaction', to: A.uid, preset: 'proud', sessionId: 'sessA1', forDay: TODAY });
  assert.strictEqual(r.reason, 'self'); ok('never to yourself');
  r = await call(F, 'sendPodReaction', { kind: 'nudge', to: A.uid, preset: 'with_you' });
  assert.strictEqual(r.reason, 'not_allowed'); ok('an outsider cannot nudge');
  r = await call(B, 'sendPodReaction', { kind: 'nudge', to: E.uid, preset: 'with_you' });
  assert.ok(r.sent); ok('nudges someone who has not shown up');
  r = await call(B, 'sendPodReaction', { kind: 'nudge', to: E.uid, preset: 'with_you' });
  assert.strictEqual(r.reason, 'already_sent'); ok('one nudge a day');
  r = await call(B, 'sendPodReaction', { kind: 'nudge', to: A.uid, preset: 'with_you' });
  assert.strictEqual(r.reason, 'already_showed_up'); ok('no nudge for someone who showed up');
  await assertSucceeds(getDocs(collection(dbB, 'pods', podId, 'reactions'))); ok('members read reactions');

  console.log('Everyone showed up');
  for (const u of [B, C, D]) {
    await updateDoc(doc(client(u), 'pods', podId, 'members', u.uid), { days: { [TODAY]: [{ id: `s_${u.uid}`, app: 'meditate' }] }, updated_at: 'now' });
  }
  await sleep(3000);
  let pod = await admin(async (db) => (await getDoc(doc(db, 'pods', podId))).data());
  assert.deepStrictEqual(pod.everyone_days, []); ok('not while one member is missing');
  await updateDoc(doc(client(E), 'pods', podId, 'members', E.uid), { days: { [TODAY]: [{ id: 's_e', app: 'meals', day: 2 }] }, updated_at: 'now' });
  assert.ok(await until(async () => (await admin(async (db) => (await getDoc(doc(db, 'pods', podId))).data())).everyone_days?.includes(TODAY)));
  ok('recorded when the last member shows up');
  await updateDoc(doc(client(E), 'pods', podId, 'members', E.uid), { share_friction: false, updated_at: 'now2' });
  await sleep(1500);
  pod = await admin(async (db) => (await getDoc(doc(db, 'pods', podId))).data());
  assert.deepStrictEqual(pod.everyone_days, [TODAY]); ok('recorded once');

  console.log('Removing, invites, leaving, deleting');
  r = await call(B, 'removeFromPod', { uid: C.uid });
  assert.strictEqual(r.reason, 'not_allowed'); ok('only the starter removes');
  r = await call(A, 'removeFromPod', { uid: E.uid });
  assert.ok(r.removed); ok('the starter removes someone');
  const afterE = await admin(async (db) => ({
    member: (await getDoc(doc(db, 'pods', podId, 'members', E.uid))).exists(),
    podId: (await getDoc(doc(db, 'users', E.uid))).data().pod_id,
    reactionsToE: (await getDocs(collection(db, 'pods', podId, 'reactions'))).docs.filter((d) => d.data().to === E.uid).length,
    pod: (await getDoc(doc(db, 'pods', podId))).data(),
  }));
  assert.deepStrictEqual([afterE.member, afterE.podId, afterE.reactionsToE], [false, undefined, 0]);
  assert.ok(!afterE.pod.member_ids.includes(E.uid)); ok('their member doc, pod_id and reactions are gone');
  await assertFails(getDoc(doc(client(E), 'pods', podId))); ok('and they can no longer read the pod');

  r = await call(B, 'newPodInvite');
  assert.ok(r.code && r.code !== code); ok('any member makes a new code');
  assert.strictEqual((await join(F, code, 'Fay')).reason, 'no_invite'); ok('the old code stops working');
  code = r.code;
  assert.strictEqual((await join(F, code, 'Fay')).podId, podId); ok('the new one works');

  r = await call(A, 'leavePod');
  assert.ok(r.left);
  pod = await admin(async (db) => (await getDoc(doc(db, 'pods', podId))).data());
  assert.strictEqual(pod.created_by, B.uid); ok('when the starter leaves, the longest-standing member takes over');
  const reactionsFromA = await admin(async (db) => (await getDocs(collection(db, 'pods', podId, 'reactions'))).docs.filter((d) => [d.data().from, d.data().to].includes(A.uid)).length);
  assert.strictEqual(reactionsFromA, 0); ok('reactions from and to the leaver are gone');

  // deleteAccount for D.
  r = await call(D, 'deleteAccount');
  assert.ok(r.success);
  pod = await admin(async (db) => (await getDoc(doc(db, 'pods', podId))).data());
  assert.ok(!pod.member_ids.includes(D.uid));
  assert.strictEqual(await admin(async (db) => (await getDoc(doc(db, 'pods', podId, 'members', D.uid))).exists()), false);
  ok('deleting an account takes them out of the pod');

  for (const u of [B, C, F]) assert.ok((await call(u, 'leavePod')).left);
  const gone = await admin(async (db) => ({
    pod: (await getDoc(doc(db, 'pods', podId))).exists(),
    invite: (await getDoc(doc(db, 'podInvites', code))).exists(),
    reactions: (await getDocs(collection(db, 'pods', podId, 'reactions'))).size,
    members: (await getDocs(collection(db, 'pods', podId, 'members'))).size,
  }));
  assert.deepStrictEqual(gone, { pod: false, invite: false, reactions: 0, members: 0 }); ok('the last one out deletes the pod, its invite and everything under it');
  r = await call(B, 'leavePod');
  assert.ok(r.left); ok('leaving with no pod is harmless');
  r = await call(B, 'createPod', { firstName: 'Ben' });
  assert.ok(r.podId); ok('and they can start a new one');

  await env.cleanup();
  console.log(`\n${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\nFAILED:', e); process.exit(1); });
