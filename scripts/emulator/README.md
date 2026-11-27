# Emulator checks

End-to-end checks that run the real Cloud Functions and `firestore.rules`
against the Firebase emulator, in a **`demo-` project, which can never reach
production**. Nothing here is part of `npm test`: it needs Java and the
Firebase CLI, and takes about a minute.

## pods.e2e.js

49 checks of the pod functions and rules (`functions/src/pods.ts`,
`docs/pods.md`): starting and joining, the cap of 5, one pod per person, every
security rule, reactions and nudges, everyone-showed-up firing once, removing,
invites, leaving, account deletion, and cleanup. Pushes aren't sent: the test
users have no push tokens.

Run from the repo root (tools go in a throwaway folder, not the repo):

```bash
npm --prefix functions ci --ignore-scripts && npm --prefix functions run build
T=$(mktemp -d) && (cd $T && npm init -y >/dev/null && \
  npm i --legacy-peer-deps firebase-tools@14 @firebase/rules-unit-testing firebase@12)
$T/node_modules/.bin/firebase emulators:exec \
  --project demo-pods --only firestore,functions,auth \
  "NODE_PATH=$T/node_modules node scripts/emulator/pods.e2e.js firestore.rules"
```

Ports and hosts come from the `emulators` block in `firebase.json` (local
only; deploys ignore it).

Rebuild `functions/` (`npm --prefix functions run build`) after any change to
it: the emulator runs `functions/lib/`.
