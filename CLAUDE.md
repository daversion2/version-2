# Neuro-Nudge — Claude Code Context

## Running the App

This app uses native modules (Google Sign-In, etc.) and **cannot run in Expo Go**.

**To start the simulator:**
```bash
npx expo run:ios
```
This compiles the full native iOS build. Takes a few minutes the first time; faster on subsequent runs.

**If the native build already exists and you just need the bundler:**
```bash
npx expo start --dev-client
```
Then open the app manually from the simulator.

Do NOT use `npx expo start` + press `i` — it will crash with a `TurboModuleRegistry` / `RNGoogleSignin` error because Expo Go doesn't include the native modules.

## Pushing to the Live Production App (OTA Update)

When the user says "push to production", "push to live", "ship this", or similar — this means an **EAS OTA (over-the-air) update**, NOT an App Store submission.

OTA updates push the JS bundle directly to users' devices without going through App Store review. Users get the update automatically on their next app launch. This works for any change that is pure JavaScript/TypeScript (screens, logic, data, styles). It does NOT work for native module changes.

**Command:**
```bash
eas update --branch production --message "description of what changed"
```

This builds and uploads iOS + Android bundles simultaneously. Takes ~30–60 seconds. No confirmation needed — just run it.

**Do NOT use:**
- `eas build` — this creates a full native binary (for App Store submissions only, takes 15–30 min)
- `eas submit` — this submits to the App Store for review

EAS project: `neuro-nudge-v2` (account: `jonnymcfadden1528s-organization`)
Dashboard: https://expo.dev/accounts/jonnymcfadden1528s-organization/projects/neuro-nudge-v2/updates

## Deploying Firebase

**Deploy Cloud Functions:**
```bash
firebase deploy --only functions
```

**Deploy Firestore indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Deploy both at once:**
```bash
firebase deploy --only functions,firestore:indexes
```

Firebase project ID: `version-2-4afa1`

If not authenticated: `firebase login`

## Tech Stack
- React Native + Expo (custom dev build, not Expo Go)
- Firebase (Firestore, Cloud Functions, Auth)
- Google Sign-In (native module)
- Expo Notifications (push)

## Key Directories
- `src/screens/` — All app screens
- `src/services/` — Firestore service functions
- `src/navigation/` — Stack and tab navigators
- `src/data/` — Static data (worksheet templates, micro-exercise definitions)
- `src/types/` — TypeScript interfaces
- `src/constants/theme.ts` — Colors, Fonts, FontSizes, Spacing, BorderRadius
- `functions/src/index.ts` — All Cloud Functions (scheduled + triggered)
- `firestore.indexes.json` — Firestore composite indexes
