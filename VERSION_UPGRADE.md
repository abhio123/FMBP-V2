# Version Upgrades and Version Mismatch Fixes

This file collects every version upgrade or version mismatch we have fixed in FMBP.
Each section explains **how to recognise the problem**, then gives the **steps to fix it**
and **why each step is needed**.

> **Rule for adding a new section:** add a new numbered `##` heading at the end of this file
> and a new row in the table below. Every section must have: *How to recognise it*,
> *Why it happens*, *Steps* (each with a **Purpose**), *Problems you may hit*, and *Checklist*.

## Which section do I need?

Match the error you see with the **"You see this"** column, then jump to that section.

| # | You see this | Where you see it | Section |
|---|---|---|---|
| 1 | `Project is incompatible with this version of Expo Go` … `The installed version of Expo Go is for SDK XX` … `The project you opened uses SDK YY` | On the phone, in the Expo Go app, right after scanning the QR code | [1. Expo SDK upgrade (Expo Go mismatch)](#1-expo-sdk-upgrade-expo-go-mismatch) |
| 2 | No error message, but **features behave like an old version**: profile completion stuck at 75%, search finds "selling" but not "sell"/"sel", post forms ask only generic questions, E2E tests fail on taxonomy/form schemas | In the app, after `git pull`, with the local database (Docker) | [2. Local database behind the code](#2-local-database-behind-the-code) |
| 3 | `pnpm db:start` stops part-way and tears the stack down; `docker ps -a` shows `supabase_*_MobileApp` containers `Exited (137)` / `Exited (143)`; `docker version --format '{{.Server.Version}}'` shows **20.x** (Docker Desktop 4.14 or similar) | Terminal, when starting the local database | [3. Docker Desktop too old](#3-docker-desktop-too-old) |
| 4 | `An update for expo is available: 58.0.22 → ~58.0.24` … `11 other packages may need updating`, or `npx expo install --check` prints `expected version: ~…` with the **same SDK number** | Terminal, when running `pnpm mobile` / `npx expo start` | [4. Expo packages behind the SDK (patch updates)](#4-expo-packages-behind-the-sdk-patch-updates) |

---

## 1. Expo SDK upgrade (Expo Go mismatch)

**First done:** 2026-11-01, SDK 57 → SDK 58 (React Native 0.86 → 0.88, React 19.2 → 19.3).

### How to recognise it

When you open the app in **Expo Go**, the phone shows a message like this instead of the app:

```
Project is incompatible with this version of Expo Go
- The installed version of Expo Go is for SDK 58.0.0.
- The project you opened uses SDK 57.
```

The important part is the **two SDK numbers that don't match**. If the Expo Go SDK is
**higher** than the project's, follow this section. (If Expo Go is *lower*, update Expo Go
from the App Store / Play Store instead.)

### Why it happens

Expo Go only runs one Expo version (called an "SDK"). The App Store / Play Store updates
Expo Go to the newest SDK by itself. Our project still uses the older SDK. You can't install
an older Expo Go on an iPhone, so we **upgrade the project** to the SDK that Expo Go asks for.

> In the steps below, replace `58` with the Expo Go SDK number from **your** error message.

### Before you start

- This repo uses **pnpm**. Never run `npm install` in it.
- Commit or stash your work first, so you can easily undo the upgrade.
- Commands say where to run them: the **repo root** (`FMBP_V2/`) or the **mobile app
  folder** (`FMBP_V2/apps/mobile/`).

### Steps

**Step 1: Delete any stray `package-lock.json`**

```bash
# repo root
rm -f package-lock.json apps/mobile/package-lock.json
```

*Purpose:* If a `package-lock.json` exists, Expo thinks the project uses npm, and npm fails
with `Unsupported URL Type "workspace:"`. We only use `pnpm-lock.yaml`.

**Step 2: Upgrade the main `expo` package**

```bash
cd apps/mobile
pnpm add expo@~58.0.0
```

*Purpose:* The `expo` package decides which SDK the project uses. Once it is on the new SDK,
Expo knows the right version of every other package.

**Step 3: Let Expo fix the versions of all other packages**

```bash
# apps/mobile
npx expo install --fix --pnpm
npx expo install --check
```

*Purpose:* React Native, React, expo-router and every `expo-*` package must match the SDK
exactly. `--fix` updates them all. `--pnpm` makes sure Expo uses pnpm. `--check` must
then say **"Dependencies are up to date"**.

**Step 4: Run Expo Doctor and fix what it reports**

```bash
# apps/mobile
npx expo-doctor
```

*Purpose:* It finds problems the install step misses: old leftover packages, or `app.json`
settings the new SDK no longer accepts. Fix each one (see *Problems you may hit* below), then
run it again until all checks pass.

**Step 5: Check that the code still compiles and tests pass**

```bash
# repo root
pnpm typecheck
pnpm lint
pnpm test
```

*Purpose:* New React Native and library versions sometimes change their types or behaviour.
These commands catch it before you open the app on a phone.

**Step 6: Make sure the iPhone/Android bundle builds**

```bash
# apps/mobile
npx expo export --platform ios --output-dir ../../.export-check
npx expo export --platform android --output-dir ../../.export-check
rm -rf ../../.export-check
```

*Purpose:* Builds the same JavaScript bundle the phone downloads. Errors here would also
break the app on the phone.

**Step 7: Start the app with a clean cache and test on both phones**

```bash
# apps/mobile
npx expo start --clear
```

*Purpose:* `--clear` deletes the old bundler cache, which was built for the old SDK. Scan the
QR code on an **iPhone and an Android phone**, then log in and click through the main screens.

**Step 8: Update docs and commit**

Update the SDK and React Native versions in `README.md` (the *Layout* section), then commit
`apps/mobile/package.json`, `pnpm-lock.yaml`, `apps/mobile/app.json` and any code fixes
together.

*Purpose:* Everyone else gets the upgrade with a normal `git pull` + `pnpm install`.

### Problems you may hit (seen in the 57 → 58 upgrade)

| You see this | Why | Fix |
|---|---|---|
| `npm error Unsupported URL Type "workspace:"` | A stray `package-lock.json` made Expo use npm | Step 1, and always add `--pnpm` |
| Doctor: `"expo" should install "@expo/dom-webview@~58…"` | pnpm kept an old copy of a hidden dependency | `npx expo install @expo/dom-webview --pnpm` |
| Doctor: `Field: newArchEnabled … is not allowed` | The New Architecture is always on from SDK 58, so the setting was removed | Delete `"newArchEnabled"` from `app.json` |
| Doctor: `Field: splash … is not allowed` | Splash screen settings moved into a plugin | `npx expo install expo-splash-screen --pnpm`, then move the old `splash` settings into the plugin (example below) |
| TypeScript: `No overload matches this call` on `<RefreshControl onRefresh=…>` | React Native 0.88 requires `onRefresh` to return nothing | `onRefresh={() => q.refetch()}` → `onRefresh={() => { void q.refetch(); }}` |
| Jest: `Could not locate module react-native/react-private-interface` | An old `@react-native/jest-preset` was left installed | `pnpm add -D @react-native/jest-preset@<react-native version>` (in `apps/mobile`) |
| Android Expo Go: `Call to function 'ExpoNotificationChannelManager.setNotificationChannelAsync' has been rejected` … `NullPointerException` | Notifications don't work in Expo Go on Android. Our "am I in Expo Go?" check used `Constants.executionEnvironment`, which stopped reporting Expo Go in SDK 58 | Detect Expo Go with `isRunningInExpoGo()` from `expo` (see `apps/mobile/src/features/notifications/api.ts`) |
| iOS 26: the top of a page (title, tabs) hides behind the navigation header and back button (Android is fine) | On iOS 26 the native stack lays every page out under the navigation bar and expects the page to inset itself | Scroll pages: `contentInsetAdjustmentBehavior="automatic"` (in `Screen.tsx`). Pages that are not a scroll view (tabs above a list, chat): `useHeaderInset()` measures how far the header covers the page and pads exactly that (0 on Android/older iOS). Seen on My posts (tabs behind the header) and chat |
| Android only: photos picked on the phone show nowhere after upload (feed, post, edit), iPhone is fine. In Storage the files are **14 bytes** and contain the text `File not found` | Since SDK 58, Expo replaces `fetch` with its own. On Android it looks up `file://` paths without decoding them, and in Expo Go the app's cache folder has %-encoded characters in its name, so reading a picked photo with `fetch(uri)` returned a 404 "File not found", which was uploaded as the photo | Never read local files with `fetch`. Use `readLocalImage()` (`apps/mobile/src/lib/localImage.ts`, expo-file-system `File`), which also refuses anything that is not a JPEG / PNG / WebP / HEIC. To find broken uploads: `select name from storage.objects where (metadata->>'size')::int < 1000;` |
| `supabase start` / `db reset` / `db push` stops with `MigrationApplyError … syntax error at or near "$"` | A migration's function body opens with `# Version Upgrades and Version Mismatch Fixes

This file collects every version upgrade or version mismatch we have fixed in FMBP.
Each section explains **how to recognise the problem**, then gives the **steps to fix it**
and **why each step is needed**.

> **Rule for adding a new section:** add a new numbered `##` heading at the end of this file
> and a new row in the table below. Every section must have: *How to recognise it*,
> *Why it happens*, *Steps* (each with a **Purpose**), *Problems you may hit*, and *Checklist*.

## Which section do I need?

Match the error you see with the **"You see this"** column, then jump to that section.

| # | You see this | Where you see it | Section |
|---|---|---|---|
| 1 | `Project is incompatible with this version of Expo Go` … `The installed version of Expo Go is for SDK XX` … `The project you opened uses SDK YY` | On the phone, in the Expo Go app, right after scanning the QR code | [1. Expo SDK upgrade (Expo Go mismatch)](#1-expo-sdk-upgrade-expo-go-mismatch) |
| 2 | No error message, but **features behave like an old version**: profile completion stuck at 75%, search finds "selling" but not "sell"/"sel", post forms ask only generic questions, E2E tests fail on taxonomy/form schemas | In the app, after `git pull`, with the local database (Docker) | [2. Local database behind the code](#2-local-database-behind-the-code) |
| 3 | `pnpm db:start` stops part-way and tears the stack down; `docker ps -a` shows `supabase_*_MobileApp` containers `Exited (137)` / `Exited (143)`; `docker version --format '{{.Server.Version}}'` shows **20.x** (Docker Desktop 4.14 or similar) | Terminal, when starting the local database | [3. Docker Desktop too old](#3-docker-desktop-too-old) |
| 4 | `An update for expo is available: 58.0.22 → ~58.0.24` … `11 other packages may need updating`, or `npx expo install --check` prints `expected version: ~…` with the **same SDK number** | Terminal, when running `pnpm mobile` / `npx expo start` | [4. Expo packages behind the SDK (patch updates)](#4-expo-packages-behind-the-sdk-patch-updates) |

---

## 1. Expo SDK upgrade (Expo Go mismatch)

**First done:** 2026-11-01, SDK 57 → SDK 58 (React Native 0.86 → 0.88, React 19.2 → 19.3).

### How to recognise it

When you open the app in **Expo Go**, the phone shows a message like this instead of the app:

```
Project is incompatible with this version of Expo Go
- The installed version of Expo Go is for SDK 58.0.0.
- The project you opened uses SDK 57.
```

The important part is the **two SDK numbers that don't match**. If the Expo Go SDK is
**higher** than the project's, follow this section. (If Expo Go is *lower*, update Expo Go
from the App Store / Play Store instead.)

### Why it happens

Expo Go only runs one Expo version (called an "SDK"). The App Store / Play Store updates
Expo Go to the newest SDK by itself. Our project still uses the older SDK. You can't install
an older Expo Go on an iPhone, so we **upgrade the project** to the SDK that Expo Go asks for.

> In the steps below, replace `58` with the Expo Go SDK number from **your** error message.

### Before you start

- This repo uses **pnpm**. Never run `npm install` in it.
- Commit or stash your work first, so you can easily undo the upgrade.
- Commands say where to run them: the **repo root** (`FMBP_V2/`) or the **mobile app
  folder** (`FMBP_V2/apps/mobile/`).

### Steps

**Step 1: Delete any stray `package-lock.json`**

```bash
# repo root
rm -f package-lock.json apps/mobile/package-lock.json
```

*Purpose:* If a `package-lock.json` exists, Expo thinks the project uses npm, and npm fails
with `Unsupported URL Type "workspace:"`. We only use `pnpm-lock.yaml`.

**Step 2: Upgrade the main `expo` package**

```bash
cd apps/mobile
pnpm add expo@~58.0.0
```

*Purpose:* The `expo` package decides which SDK the project uses. Once it is on the new SDK,
Expo knows the right version of every other package.

**Step 3: Let Expo fix the versions of all other packages**

```bash
# apps/mobile
npx expo install --fix --pnpm
npx expo install --check
```

*Purpose:* React Native, React, expo-router and every `expo-*` package must match the SDK
exactly. `--fix` updates them all. `--pnpm` makes sure Expo uses pnpm. `--check` must
then say **"Dependencies are up to date"**.

**Step 4: Run Expo Doctor and fix what it reports**

```bash
# apps/mobile
npx expo-doctor
```

*Purpose:* It finds problems the install step misses: old leftover packages, or `app.json`
settings the new SDK no longer accepts. Fix each one (see *Problems you may hit* below), then
run it again until all checks pass.

**Step 5: Check that the code still compiles and tests pass**

```bash
# repo root
pnpm typecheck
pnpm lint
pnpm test
```

*Purpose:* New React Native and library versions sometimes change their types or behaviour.
These commands catch it before you open the app on a phone.

**Step 6: Make sure the iPhone/Android bundle builds**

```bash
# apps/mobile
npx expo export --platform ios --output-dir ../../.export-check
npx expo export --platform android --output-dir ../../.export-check
rm -rf ../../.export-check
```

*Purpose:* Builds the same JavaScript bundle the phone downloads. Errors here would also
break the app on the phone.

**Step 7: Start the app with a clean cache and test on both phones**

```bash
# apps/mobile
npx expo start --clear
```

*Purpose:* `--clear` deletes the old bundler cache, which was built for the old SDK. Scan the
QR code on an **iPhone and an Android phone**, then log in and click through the main screens.

**Step 8: Update docs and commit**

Update the SDK and React Native versions in `README.md` (the *Layout* section), then commit
`apps/mobile/package.json`, `pnpm-lock.yaml`, `apps/mobile/app.json` and any code fixes
together.

*Purpose:* Everyone else gets the upgrade with a normal `git pull` + `pnpm install`.

### Problems you may hit (seen in the 57 → 58 upgrade)

| You see this | Why | Fix |
|---|---|---|
| `npm error Unsupported URL Type "workspace:"` | A stray `package-lock.json` made Expo use npm | Step 1, and always add `--pnpm` |
| Doctor: `"expo" should install "@expo/dom-webview@~58…"` | pnpm kept an old copy of a hidden dependency | `npx expo install @expo/dom-webview --pnpm` |
| Doctor: `Field: newArchEnabled … is not allowed` | The New Architecture is always on from SDK 58, so the setting was removed | Delete `"newArchEnabled"` from `app.json` |
| Doctor: `Field: splash … is not allowed` | Splash screen settings moved into a plugin | `npx expo install expo-splash-screen --pnpm`, then move the old `splash` settings into the plugin (example below) |
| TypeScript: `No overload matches this call` on `<RefreshControl onRefresh=…>` | React Native 0.88 requires `onRefresh` to return nothing | `onRefresh={() => q.refetch()}` → `onRefresh={() => { void q.refetch(); }}` |
| Jest: `Could not locate module react-native/react-private-interface` | An old `@react-native/jest-preset` was left installed | `pnpm add -D @react-native/jest-preset@<react-native version>` (in `apps/mobile`) |
| Android Expo Go: `Call to function 'ExpoNotificationChannelManager.setNotificationChannelAsync' has been rejected` … `NullPointerException` | Notifications don't work in Expo Go on Android. Our "am I in Expo Go?" check used `Constants.executionEnvironment`, which stopped reporting Expo Go in SDK 58 | Detect Expo Go with `isRunningInExpoGo()` from `expo` (see `apps/mobile/src/features/notifications/api.ts`) |
| iOS 26: the top of a page (title, tabs) hides behind the navigation header and back button (Android is fine) | On iOS 26 the native stack lays every page out under the navigation bar and expects the page to inset itself | Scroll pages: `contentInsetAdjustmentBehavior="automatic"` (in `Screen.tsx`). Pages that are not a scroll view (tabs above a list, chat): `useHeaderInset()` measures how far the header covers the page and pads exactly that (0 on Android/older iOS). Seen on My posts (tabs behind the header) and chat |
 instead of `$` (seen in `20261105000007_referrals_and_boosts.sql`, fixed 2026-11-06). A database that already had the function did not notice; a fresh one does | Open the file named in the error, find `as # Version Upgrades and Version Mismatch Fixes

This file collects every version upgrade or version mismatch we have fixed in FMBP.
Each section explains **how to recognise the problem**, then gives the **steps to fix it**
and **why each step is needed**.

> **Rule for adding a new section:** add a new numbered `##` heading at the end of this file
> and a new row in the table below. Every section must have: *How to recognise it*,
> *Why it happens*, *Steps* (each with a **Purpose**), *Problems you may hit*, and *Checklist*.

## Which section do I need?

Match the error you see with the **"You see this"** column, then jump to that section.

| # | You see this | Where you see it | Section |
|---|---|---|---|
| 1 | `Project is incompatible with this version of Expo Go` … `The installed version of Expo Go is for SDK XX` … `The project you opened uses SDK YY` | On the phone, in the Expo Go app, right after scanning the QR code | [1. Expo SDK upgrade (Expo Go mismatch)](#1-expo-sdk-upgrade-expo-go-mismatch) |
| 2 | No error message, but **features behave like an old version**: profile completion stuck at 75%, search finds "selling" but not "sell"/"sel", post forms ask only generic questions, E2E tests fail on taxonomy/form schemas | In the app, after `git pull`, with the local database (Docker) | [2. Local database behind the code](#2-local-database-behind-the-code) |
| 3 | `pnpm db:start` stops part-way and tears the stack down; `docker ps -a` shows `supabase_*_MobileApp` containers `Exited (137)` / `Exited (143)`; `docker version --format '{{.Server.Version}}'` shows **20.x** (Docker Desktop 4.14 or similar) | Terminal, when starting the local database | [3. Docker Desktop too old](#3-docker-desktop-too-old) |
| 4 | `An update for expo is available: 58.0.22 → ~58.0.24` … `11 other packages may need updating`, or `npx expo install --check` prints `expected version: ~…` with the **same SDK number** | Terminal, when running `pnpm mobile` / `npx expo start` | [4. Expo packages behind the SDK (patch updates)](#4-expo-packages-behind-the-sdk-patch-updates) |

---

## 1. Expo SDK upgrade (Expo Go mismatch)

**First done:** 2026-11-01, SDK 57 → SDK 58 (React Native 0.86 → 0.88, React 19.2 → 19.3).

### How to recognise it

When you open the app in **Expo Go**, the phone shows a message like this instead of the app:

```
Project is incompatible with this version of Expo Go
- The installed version of Expo Go is for SDK 58.0.0.
- The project you opened uses SDK 57.
```

The important part is the **two SDK numbers that don't match**. If the Expo Go SDK is
**higher** than the project's, follow this section. (If Expo Go is *lower*, update Expo Go
from the App Store / Play Store instead.)

### Why it happens

Expo Go only runs one Expo version (called an "SDK"). The App Store / Play Store updates
Expo Go to the newest SDK by itself. Our project still uses the older SDK. You can't install
an older Expo Go on an iPhone, so we **upgrade the project** to the SDK that Expo Go asks for.

> In the steps below, replace `58` with the Expo Go SDK number from **your** error message.

### Before you start

- This repo uses **pnpm**. Never run `npm install` in it.
- Commit or stash your work first, so you can easily undo the upgrade.
- Commands say where to run them: the **repo root** (`FMBP_V2/`) or the **mobile app
  folder** (`FMBP_V2/apps/mobile/`).

### Steps

**Step 1: Delete any stray `package-lock.json`**

```bash
# repo root
rm -f package-lock.json apps/mobile/package-lock.json
```

*Purpose:* If a `package-lock.json` exists, Expo thinks the project uses npm, and npm fails
with `Unsupported URL Type "workspace:"`. We only use `pnpm-lock.yaml`.

**Step 2: Upgrade the main `expo` package**

```bash
cd apps/mobile
pnpm add expo@~58.0.0
```

*Purpose:* The `expo` package decides which SDK the project uses. Once it is on the new SDK,
Expo knows the right version of every other package.

**Step 3: Let Expo fix the versions of all other packages**

```bash
# apps/mobile
npx expo install --fix --pnpm
npx expo install --check
```

*Purpose:* React Native, React, expo-router and every `expo-*` package must match the SDK
exactly. `--fix` updates them all. `--pnpm` makes sure Expo uses pnpm. `--check` must
then say **"Dependencies are up to date"**.

**Step 4: Run Expo Doctor and fix what it reports**

```bash
# apps/mobile
npx expo-doctor
```

*Purpose:* It finds problems the install step misses: old leftover packages, or `app.json`
settings the new SDK no longer accepts. Fix each one (see *Problems you may hit* below), then
run it again until all checks pass.

**Step 5: Check that the code still compiles and tests pass**

```bash
# repo root
pnpm typecheck
pnpm lint
pnpm test
```

*Purpose:* New React Native and library versions sometimes change their types or behaviour.
These commands catch it before you open the app on a phone.

**Step 6: Make sure the iPhone/Android bundle builds**

```bash
# apps/mobile
npx expo export --platform ios --output-dir ../../.export-check
npx expo export --platform android --output-dir ../../.export-check
rm -rf ../../.export-check
```

*Purpose:* Builds the same JavaScript bundle the phone downloads. Errors here would also
break the app on the phone.

**Step 7: Start the app with a clean cache and test on both phones**

```bash
# apps/mobile
npx expo start --clear
```

*Purpose:* `--clear` deletes the old bundler cache, which was built for the old SDK. Scan the
QR code on an **iPhone and an Android phone**, then log in and click through the main screens.

**Step 8: Update docs and commit**

Update the SDK and React Native versions in `README.md` (the *Layout* section), then commit
`apps/mobile/package.json`, `pnpm-lock.yaml`, `apps/mobile/app.json` and any code fixes
together.

*Purpose:* Everyone else gets the upgrade with a normal `git pull` + `pnpm install`.

### Problems you may hit (seen in the 57 → 58 upgrade)

| You see this | Why | Fix |
|---|---|---|
| `npm error Unsupported URL Type "workspace:"` | A stray `package-lock.json` made Expo use npm | Step 1, and always add `--pnpm` |
| Doctor: `"expo" should install "@expo/dom-webview@~58…"` | pnpm kept an old copy of a hidden dependency | `npx expo install @expo/dom-webview --pnpm` |
| Doctor: `Field: newArchEnabled … is not allowed` | The New Architecture is always on from SDK 58, so the setting was removed | Delete `"newArchEnabled"` from `app.json` |
| Doctor: `Field: splash … is not allowed` | Splash screen settings moved into a plugin | `npx expo install expo-splash-screen --pnpm`, then move the old `splash` settings into the plugin (example below) |
| TypeScript: `No overload matches this call` on `<RefreshControl onRefresh=…>` | React Native 0.88 requires `onRefresh` to return nothing | `onRefresh={() => q.refetch()}` → `onRefresh={() => { void q.refetch(); }}` |
| Jest: `Could not locate module react-native/react-private-interface` | An old `@react-native/jest-preset` was left installed | `pnpm add -D @react-native/jest-preset@<react-native version>` (in `apps/mobile`) |
| Android Expo Go: `Call to function 'ExpoNotificationChannelManager.setNotificationChannelAsync' has been rejected` … `NullPointerException` | Notifications don't work in Expo Go on Android. Our "am I in Expo Go?" check used `Constants.executionEnvironment`, which stopped reporting Expo Go in SDK 58 | Detect Expo Go with `isRunningInExpoGo()` from `expo` (see `apps/mobile/src/features/notifications/api.ts`) |
| iOS 26: the top of a page (title, tabs) hides behind the navigation header and back button (Android is fine) | On iOS 26 the native stack lays every page out under the navigation bar and expects the page to inset itself | Scroll pages: `contentInsetAdjustmentBehavior="automatic"` (in `Screen.tsx`). Pages that are not a scroll view (tabs above a list, chat): `useHeaderInset()` measures how far the header covers the page and pads exactly that (0 on Android/older iOS). Seen on My posts (tabs behind the header) and chat |
 at the end of a `create function` line and make it `as $`. Check all files: search for lines ending in ` as # Version Upgrades and Version Mismatch Fixes

This file collects every version upgrade or version mismatch we have fixed in FMBP.
Each section explains **how to recognise the problem**, then gives the **steps to fix it**
and **why each step is needed**.

> **Rule for adding a new section:** add a new numbered `##` heading at the end of this file
> and a new row in the table below. Every section must have: *How to recognise it*,
> *Why it happens*, *Steps* (each with a **Purpose**), *Problems you may hit*, and *Checklist*.

## Which section do I need?

Match the error you see with the **"You see this"** column, then jump to that section.

| # | You see this | Where you see it | Section |
|---|---|---|---|
| 1 | `Project is incompatible with this version of Expo Go` … `The installed version of Expo Go is for SDK XX` … `The project you opened uses SDK YY` | On the phone, in the Expo Go app, right after scanning the QR code | [1. Expo SDK upgrade (Expo Go mismatch)](#1-expo-sdk-upgrade-expo-go-mismatch) |
| 2 | No error message, but **features behave like an old version**: profile completion stuck at 75%, search finds "selling" but not "sell"/"sel", post forms ask only generic questions, E2E tests fail on taxonomy/form schemas | In the app, after `git pull`, with the local database (Docker) | [2. Local database behind the code](#2-local-database-behind-the-code) |
| 3 | `pnpm db:start` stops part-way and tears the stack down; `docker ps -a` shows `supabase_*_MobileApp` containers `Exited (137)` / `Exited (143)`; `docker version --format '{{.Server.Version}}'` shows **20.x** (Docker Desktop 4.14 or similar) | Terminal, when starting the local database | [3. Docker Desktop too old](#3-docker-desktop-too-old) |
| 4 | `An update for expo is available: 58.0.22 → ~58.0.24` … `11 other packages may need updating`, or `npx expo install --check` prints `expected version: ~…` with the **same SDK number** | Terminal, when running `pnpm mobile` / `npx expo start` | [4. Expo packages behind the SDK (patch updates)](#4-expo-packages-behind-the-sdk-patch-updates) |

---

## 1. Expo SDK upgrade (Expo Go mismatch)

**First done:** 2026-11-01, SDK 57 → SDK 58 (React Native 0.86 → 0.88, React 19.2 → 19.3).

### How to recognise it

When you open the app in **Expo Go**, the phone shows a message like this instead of the app:

```
Project is incompatible with this version of Expo Go
- The installed version of Expo Go is for SDK 58.0.0.
- The project you opened uses SDK 57.
```

The important part is the **two SDK numbers that don't match**. If the Expo Go SDK is
**higher** than the project's, follow this section. (If Expo Go is *lower*, update Expo Go
from the App Store / Play Store instead.)

### Why it happens

Expo Go only runs one Expo version (called an "SDK"). The App Store / Play Store updates
Expo Go to the newest SDK by itself. Our project still uses the older SDK. You can't install
an older Expo Go on an iPhone, so we **upgrade the project** to the SDK that Expo Go asks for.

> In the steps below, replace `58` with the Expo Go SDK number from **your** error message.

### Before you start

- This repo uses **pnpm**. Never run `npm install` in it.
- Commit or stash your work first, so you can easily undo the upgrade.
- Commands say where to run them: the **repo root** (`FMBP_V2/`) or the **mobile app
  folder** (`FMBP_V2/apps/mobile/`).

### Steps

**Step 1: Delete any stray `package-lock.json`**

```bash
# repo root
rm -f package-lock.json apps/mobile/package-lock.json
```

*Purpose:* If a `package-lock.json` exists, Expo thinks the project uses npm, and npm fails
with `Unsupported URL Type "workspace:"`. We only use `pnpm-lock.yaml`.

**Step 2: Upgrade the main `expo` package**

```bash
cd apps/mobile
pnpm add expo@~58.0.0
```

*Purpose:* The `expo` package decides which SDK the project uses. Once it is on the new SDK,
Expo knows the right version of every other package.

**Step 3: Let Expo fix the versions of all other packages**

```bash
# apps/mobile
npx expo install --fix --pnpm
npx expo install --check
```

*Purpose:* React Native, React, expo-router and every `expo-*` package must match the SDK
exactly. `--fix` updates them all. `--pnpm` makes sure Expo uses pnpm. `--check` must
then say **"Dependencies are up to date"**.

**Step 4: Run Expo Doctor and fix what it reports**

```bash
# apps/mobile
npx expo-doctor
```

*Purpose:* It finds problems the install step misses: old leftover packages, or `app.json`
settings the new SDK no longer accepts. Fix each one (see *Problems you may hit* below), then
run it again until all checks pass.

**Step 5: Check that the code still compiles and tests pass**

```bash
# repo root
pnpm typecheck
pnpm lint
pnpm test
```

*Purpose:* New React Native and library versions sometimes change their types or behaviour.
These commands catch it before you open the app on a phone.

**Step 6: Make sure the iPhone/Android bundle builds**

```bash
# apps/mobile
npx expo export --platform ios --output-dir ../../.export-check
npx expo export --platform android --output-dir ../../.export-check
rm -rf ../../.export-check
```

*Purpose:* Builds the same JavaScript bundle the phone downloads. Errors here would also
break the app on the phone.

**Step 7: Start the app with a clean cache and test on both phones**

```bash
# apps/mobile
npx expo start --clear
```

*Purpose:* `--clear` deletes the old bundler cache, which was built for the old SDK. Scan the
QR code on an **iPhone and an Android phone**, then log in and click through the main screens.

**Step 8: Update docs and commit**

Update the SDK and React Native versions in `README.md` (the *Layout* section), then commit
`apps/mobile/package.json`, `pnpm-lock.yaml`, `apps/mobile/app.json` and any code fixes
together.

*Purpose:* Everyone else gets the upgrade with a normal `git pull` + `pnpm install`.

### Problems you may hit (seen in the 57 → 58 upgrade)

| You see this | Why | Fix |
|---|---|---|
| `npm error Unsupported URL Type "workspace:"` | A stray `package-lock.json` made Expo use npm | Step 1, and always add `--pnpm` |
| Doctor: `"expo" should install "@expo/dom-webview@~58…"` | pnpm kept an old copy of a hidden dependency | `npx expo install @expo/dom-webview --pnpm` |
| Doctor: `Field: newArchEnabled … is not allowed` | The New Architecture is always on from SDK 58, so the setting was removed | Delete `"newArchEnabled"` from `app.json` |
| Doctor: `Field: splash … is not allowed` | Splash screen settings moved into a plugin | `npx expo install expo-splash-screen --pnpm`, then move the old `splash` settings into the plugin (example below) |
| TypeScript: `No overload matches this call` on `<RefreshControl onRefresh=…>` | React Native 0.88 requires `onRefresh` to return nothing | `onRefresh={() => q.refetch()}` → `onRefresh={() => { void q.refetch(); }}` |
| Jest: `Could not locate module react-native/react-private-interface` | An old `@react-native/jest-preset` was left installed | `pnpm add -D @react-native/jest-preset@<react-native version>` (in `apps/mobile`) |
| Android Expo Go: `Call to function 'ExpoNotificationChannelManager.setNotificationChannelAsync' has been rejected` … `NullPointerException` | Notifications don't work in Expo Go on Android. Our "am I in Expo Go?" check used `Constants.executionEnvironment`, which stopped reporting Expo Go in SDK 58 | Detect Expo Go with `isRunningInExpoGo()` from `expo` (see `apps/mobile/src/features/notifications/api.ts`) |
| iOS 26: the top of a page (title, tabs) hides behind the navigation header and back button (Android is fine) | On iOS 26 the native stack lays every page out under the navigation bar and expects the page to inset itself | Scroll pages: `contentInsetAdjustmentBehavior="automatic"` (in `Screen.tsx`). Pages that are not a scroll view (tabs above a list, chat): `useHeaderInset()` measures how far the header covers the page and pads exactly that (0 on Android/older iOS). Seen on My posts (tabs behind the header) and chat |
 |
| After a fresh `supabase start` or `db reset`, individuals see no post types to choose (or a migration's `update` of post types / categories changed nothing) | On a brand-new database the seeds (which create post types, categories, forms) run **after** the migrations, so a migration that updates seed rows finds none | Put the same update in a seed file too (`supabase/seed/05_individual_post_types.sql`), then `pnpm db:seed`. Rule: data that seeds create is changed in a seed file, not only in a migration |
| Photo upload fails: `database error, code: 42P10` (storage log: "there is no unique or exclusion constraint matching the ON CONFLICT specification"), right after `supabase start` pulled a newer storage image (local only) | Supabase CLI 3 starts the newest storage service (1.88), which expects a unique index on `storage.objects (bucket_id, name COLLATE "C") WHERE archived_at IS NULL`; a local database created by older versions only has it without `COLLATE "C"` | Add the index once: `docker exec supabase_db_MobileApp psql -U supabase_admin -d postgres -c "create unique index if not exists idx_objects_current_version_c on storage.objects (bucket_id, name collate \"C\") where archived_at is null;"` (or `pnpm db:reset`, which wipes local data). Hosted Supabase is not affected |
| Android (14 and older): an empty band, about as tall as the status bar, above the back arrow on every page with a header (tab pages look fine) | The app is edge-to-edge (Expo), but on Android 14 and older React Native 0.88 reports "not edge-to-edge", so `react-native-keyboard-controller` also pads the whole app by the status bar height, on top of the header's own status bar space | `<KeyboardProvider statusBarTranslucent>` on Android below API 35 (`app/_layout.tsx`, `STATUS_BAR_TRANSLUCENT`). Android 15+ is detected by the library already; passing the prop there only logs "value is ignored" |

Splash screen plugin example (inside `"plugins"` in `apps/mobile/app.json`):

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#1F6F5F",
    "imageWidth": 200
  }
]
```

### Checklist

- [ ] No `package-lock.json` left
- [ ] `pnpm add expo@~<SDK>.0.0`
- [ ] `npx expo install --fix --pnpm`, then `--check` says "up to date"
- [ ] `npx expo-doctor` passes
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass
- [ ] iOS and Android export build
- [ ] App opens and works on an iPhone **and** an Android phone
- [ ] README versions updated, changes committed

---

## 2. Local database behind the code

**First seen:** 2026-11-01. The local database had migrations only up to `20260913000003`, while the code
expected migrations up to `20261010000002` and the seed data from 2026-10-10.

### How to recognise it

There is **no error message**. The app runs, but some features act like an older version of FMBP:

- Profile completion stays at **75%** even when every field is filled.
- Search finds a post by a full word ("selling") but not by the start of it ("sel", "sell").
- Creating a post shows only generic questions instead of the form for that post type.
- `pnpm --filter @fmbp/mobile test:e2e` fails in "taxonomy and form schemas" or "create post".

Confirm it with this command (repo root, Docker running):

```bash
npx supabase migration list --local
```

In the output, `local` is the migration **file** in the repo and `remote` is what your **database** has
applied (here "remote" means your local Docker database). Any file without a matching `remote` value was never
applied. You can also compare the newest file in `supabase/migrations/` with:

```bash
docker exec supabase_db_MobileApp psql -U postgres -tA -c "select max(version) from supabase_migrations.schema_migrations;"
```

### Why it happens

The database runs in Docker on your own PC. `git pull` updates the code, **but not the database**.
New database changes come as files in two folders:

- `supabase/migrations/`: changes to tables and functions (for example how completion or search is calculated)
- `supabase/seed/`: starting data (post types, categories, forms for each post type)

They only reach your database when you apply them yourself.

### Steps

**Step 1: Make sure Docker Desktop and the local database are running**

```bash
# repo root
pnpm db:start
```

*Purpose:* The commands below talk to the database, so it must be running. If it already runs, this just
prints the connection details.

**Step 2: Apply the new migrations (keeps your data)**

```bash
# repo root
npx supabase migration up
```

*Purpose:* Applies only the migration files your database doesn't have yet. Your users, businesses, posts and
chats stay as they are.

**Step 3 (only if files in `supabase/seed/` or `supabase/forms/` changed): reload the seed data**

```bash
# repo root
pnpm db:seed                                  # post types + forms; keeps all your users, posts and chats
```

*Purpose:* Seed files (post types, forms) are not migrations, so `migration up` does not load them. The seed files only
insert or update their own rows, so they can be re-applied safely at any time.
(`pnpm db:reset` also reloads them but **deletes every local user, business, post and chat**: use it only when the
local database is broken, then `pnpm demo:data` and log in again. Test logins: `9999900001`–`9999900009` (users) and `9999900000` (admin, `pnpm admin:local`), OTP `123456`.)

**Step 4: Regenerate the TypeScript database types (only if migrations changed tables)**

```bash
# repo root
pnpm db:types
pnpm typecheck
```

*Purpose:* Keeps `packages/shared/src/database.types.ts` in sync with the database so type errors show up
before runtime errors.

**Step 5: Check**

```bash
pnpm --filter @fmbp/mobile test:e2e   # needs `pnpm functions:serve` running in another terminal
```

*Purpose:* The E2E suite runs against your local database and fails if it is still behind the code.

### Problems you may hit

| You see this | Why | Fix |
|---|---|---|
| `failed to connect to the docker API` | Docker Desktop is not running | Start Docker Desktop, wait until it says "running", then `pnpm db:start` |
| Login on the phone spins, then shows "No internet connection" | The phone can't reach the database on your PC | Docker running? Phone on the same Wi-Fi? Windows Firewall allows port 54321? |
| `migration up` fails on one file | Someone edited a migration that was already applied | Never edit an applied migration; add a new one. Locally: `pnpm db:reset` |

### Checklist

- [ ] Docker Desktop running, `pnpm db:start` done
- [ ] `npx supabase migration up` applied everything
- [ ] Seeds or forms changed? `pnpm db:seed` (keeps data)
- [ ] `pnpm db:types` if tables changed
- [ ] E2E suite passes

---

## 3. Docker Desktop too old

**First done:** 2026-11-12, Docker Desktop 4.14.0 (engine 20.10.21, from 2022) → 4.99.0, on an Apple Silicon Mac.

### How to recognise it

- `pnpm db:start` stops part-way and removes the containers again, sometimes with a Docker Hub rate-limit message.
- `docker ps -a` shows the `supabase_*_MobileApp` containers as `Exited (137)` or `Exited (143)`, with only
  `supabase_db_MobileApp` still `Up`.
- The engine is old:

```bash
docker version --format '{{.Server.Version}}'      # 20.x = too old (current Docker Desktop ships 28+)
```

Exit code 137/143 only means "killed/stopped". It also appears when a `supabase start` is interrupted (Ctrl+C), so
first retry once: `npx supabase stop`, then `npx supabase start --debug`, and read the failing container's log
(`docker logs supabase_studio_MobileApp`). If it still fails and the engine is 20.x, update Docker.

### Why it happens

The Supabase CLI always pulls the newest service images (Postgres 17, Studio, storage, edge runtime). They are built
and tested against current Docker engines; a 2022 engine is a likely cause of random start failures. (On 2026-11-12
the retry alone fixed the start, so the old engine was not proven to be the cause; it was updated to remove the risk.)

### Before you start

Your local database and uploaded photos live **inside Docker's virtual disk**. A Docker update normally keeps them,
but back them up first:

```bash
# repo root, Docker and the database running
mkdir -p ../FMBP-local-backup-$(date +%Y%m%d)
docker exec supabase_db_MobileApp pg_dumpall -U postgres > ../FMBP-local-backup-$(date +%Y%m%d)/db.sql
docker run --rm -v supabase_storage_MobileApp:/data -v "$(cd ../FMBP-local-backup-$(date +%Y%m%d) && pwd)":/out alpine tar czf /out/storage.tgz -C /data .
grep -c "dump complete" ../FMBP-local-backup-$(date +%Y%m%d)/db.sql   # must print a number above 0
```

*Purpose:* If the new Docker cannot read the old virtual disk, you can still get your data back.

### Steps

**Step 1: Stop the stack and quit Docker**

```bash
npx supabase stop          # keeps a backup volume, does not delete data
```

Then quit Docker Desktop from the whale icon in the menu bar (Quit Docker Desktop).

*Purpose:* The database must not be writing while Docker is replaced.

**Step 2: Install the new Docker Desktop**

Download from https://www.docker.com/products/docker-desktop (pick **Apple Silicon** or **Intel** to match your Mac;
Windows: the Windows installer), open the `.dmg` and drag **Docker** onto **Applications**, choosing **Replace**.

Or, in **your own terminal** (it asks for your Mac password):

```bash
brew install --cask --force docker-desktop
```

*Purpose:* Puts the current Docker engine in place. **Do not run the `brew` command from a tool or script that cannot
type your password** (for example an AI assistant's shell): `sudo` fails half-way and Homebrew's rollback then
**deletes** `/Applications/Docker.app` instead of restoring the old one. Your data is not lost when that happens
(it lives in `~/Library/Containers/com.docker.docker`); just install from the `.dmg`.

**Step 3: Start Docker**

Open Docker from Applications. Accept the licence and, when asked, enter your Mac password so it can install its
helper. Wait until the menu bar whale says **Docker Desktop is running**, then check:

```bash
docker version --format '{{.Server.Version}}'      # now 28+ (not 20.x)
```

*Purpose:* Confirms the new engine is the one answering.

**Step 4: Start the database again and check your data**

```bash
pnpm db:start
docker exec supabase_db_MobileApp psql -U postgres -tAc "select count(*) from public.businesses;"
```

*Purpose:* The count should match what you had before. Then run `pnpm functions:serve` and `pnpm mobile` as usual.

### Problems you may hit

| You see this | Why | Fix |
|---|---|---|
| `Error: docker-desktop: Failure while executing; /usr/bin/sudo …` … `a terminal is required to read the password`, and Docker is gone from Applications | `brew` was run where it could not ask for a password, and its rollback removed the app | Install from the `.dmg` (Step 2). Data is still in `~/Library/Containers/com.docker.docker` |
| `ditto` / `cp` into `/Applications/Docker.app` fails with `Operation not permitted` | macOS blocks a terminal from writing inside app bundles | Use Finder (drag from the `.dmg`) |
| `Cannot connect to the Docker daemon at unix:///…/docker.sock` | Docker Desktop not started yet, or still starting | Open Docker and wait for "running" |
| After the update the database is empty | The old virtual disk could not be used | Ask before restoring: `db.sql` is a full `pg_dumpall` and must be loaded into a matching Postgres; `storage.tgz` is extracted back into the `supabase_storage_MobileApp` volume |

### Checklist

- [ ] Backup made (`db.sql` says "dump complete", `storage.tgz` exists)
- [ ] `npx supabase stop`, Docker quit
- [ ] New Docker installed and running, engine 28+
- [ ] `pnpm db:start` succeeds, data count matches
- [ ] App logs in on a phone

---

## 4. Expo packages behind the SDK (patch updates)

**First done:** 2026-11-12, inside SDK 58: `expo` 58.0.22 → 58.0.24 and 11 other packages
(`@expo/metro-runtime`, `expo-constants`, `expo-linking`, `expo-location`, `expo-notifications`, `expo-router`,
`expo-secure-store`, `expo-splash-screen`, `expo-status-bar`, `react-native-safe-area-context` 5.10 → 5.11,
`jest-expo`).

### How to recognise it

`npx expo start` prints:

```
An update for expo is available: 58.0.22 → ~58.0.24
11 other packages may need updating. Run npx expo install --check for details.
```

and `npx expo install --check` lists packages with `expected version: ~58.x.y`. The **SDK number is the same** (58 → 58).
If the SDK number changes (58 → 59), or Expo Go says "Project is incompatible", use section 1 instead.

### Why it happens

Expo ships bug-fix releases of the SDK packages every few weeks. Each Expo version expects matching versions of its
packages; drifting apart can cause subtle native-module bugs. Patch updates do not change the SDK, so the Expo Go app
on the phones keeps working.

### Steps

**Step 1: See what is behind**

```bash
# apps/mobile
CI=1 npx expo install --check
```

*Purpose:* Lists every package and the version Expo expects. `CI=1` stops it asking questions.

**Step 2: Update them**

```bash
# apps/mobile
CI=1 npx expo install --fix
cd ../.. && pnpm install
```

*Purpose:* `--fix` rewrites `apps/mobile/package.json` and `pnpm-lock.yaml` but only updates the lockfile
(`Lockfile only installation will make it out-of-date`); `pnpm install` then installs the new versions.

**Step 3: Check**

```bash
# apps/mobile
CI=1 npx expo install --check      # must say "Dependencies are up to date"
npx expo-doctor
# repo root
pnpm typecheck && pnpm lint && pnpm test
```

*Purpose:* Proves nothing is still behind and nothing broke.

**Step 4: Start fresh and test on both phones**

```bash
# apps/mobile
npx expo start --clear
```

*Purpose:* `--clear` drops the old bundler cache built with the previous versions. Open on an iPhone and an Android phone.

### Problems you may hit

| You see this | Why | Fix |
|---|---|---|
| `expo-doctor`: `"watchFolders" does not contain all entries from Expo's defaults` | Our `metro.config.js` deliberately watches the whole monorepo root (`../..`), which already contains Expo's default folders | Expected; leave `metro.config.js` as it is |
| `npm error Unsupported URL Type "workspace:"` | A stray `package-lock.json` made Expo use npm | Delete `package-lock.json`, re-run with pnpm (section 1) |

### Checklist

- [ ] `npx expo install --check` says "up to date"
- [ ] `pnpm install` run after `--fix`
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass
- [ ] `npx expo start --clear`, app works on an iPhone **and** an Android phone
- [ ] Changes to `apps/mobile/package.json` and `pnpm-lock.yaml` committed
