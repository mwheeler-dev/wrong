# Wrong. — Android native polish

This document captures the native shell that wraps the Wrong. web app via
Capacitor. The shell loads `https://www.wrong-app.com` directly (set in
`capacitor.config.ts → server.url`); the same Next.js bundle that serves
the browser also runs inside the Android WebView. Everything described
here is **additive** to the web app — every native helper no-ops in a
plain browser.

## Native features added

- **App icon + splash** — generated from `resources/icon.png` and
  `resources/splash.png`. White paper background, black "Wrong" wordmark,
  neon yellow-green dot. See "Regenerating assets" below.
- **Status bar polish** — light background (`#FFFFFF`), dark icons, no
  WebView overlay. Configured in [src/lib/native.ts](../src/lib/native.ts).
- **Haptics** — light/medium/heavy impact, success/warning/error
  notification, selection. Helpers in
  [src/lib/native.ts](../src/lib/native.ts). Wired into gameplay:
    - light impact on answer select
    - medium impact on "Lock It In"
    - success/error on resolved correct/wrong result
    - warning on timer expiry
    - light/light/medium warning pulses at 10s / 5s / 3s remaining
      (single-fire per question, never re-fires after a tab switch — see
      [src/components/Timer.tsx](../src/components/Timer.tsx)).
- **Pull-to-refresh** — touch-only, only when scroll is at the top,
  conservative on `/play` (auto-disabled to protect active timer state).
  See [src/components/PullToRefresh.tsx](../src/components/PullToRefresh.tsx).
- **Push notification groundwork** — permission request, registration,
  and listeners are scaffolded in
  [src/lib/pushNotifications.ts](../src/lib/pushNotifications.ts).
  **NOT production-ready** — see "Before pushing campaigns" below.
- **App lifecycle** — pause/resume listeners attached in
  [src/lib/appLifecycle.ts](../src/lib/appLifecycle.ts). **The active
  question timer is deliberately NOT reset on resume** — the timer is
  bound to an absolute deadline persisted in `sessionStorage`, so the
  countdown survives backgrounding, refreshes, and remounts.

## Regenerating icon/splash

The brand artwork is generated programmatically so we don't carry binary
art in the repo unless we want to.

```bash
# 1. Re-render resources/icon.png + resources/splash.png from the inline
#    SVG in scripts/generate-brand-assets.mjs
node scripts/generate-brand-assets.mjs

# 2. Fan the source assets out into every Android density bucket.
npx capacitor-assets generate --android
```

Edit `scripts/generate-brand-assets.mjs` if you want to tweak the
wordmark size, dot position, or colors.

## Building and syncing

```bash
# 1. Install dependencies (idempotent).
npm install

# 2. Build the Next.js app. NOTE: this is the web build; the Android
#    shell loads the live deployment via server.url, not these files.
#    The build still has to pass before sync so Capacitor can verify
#    plugin registration.
npm run build

# 3. Copy native plugin code and config into android/.
npx cap sync android
```

## Testing in Android Studio

1. `npx cap open android` (or open `android/` in Android Studio directly).
2. Wait for Gradle sync. If Gradle complains about a missing
   `google-services.json`, that's expected until we add Firebase (push
   notifications are in groundwork mode and don't ship a Firebase config).
3. Pick an emulator (Pixel 6, API 33+ recommended) and run.
4. Smoke test:
    - Splash shows the Wrong. logo on white, fades out within ~2s.
    - Status bar text is dark, background is white, no overlay.
    - `/play` haptics fire on YES/NO select, "Lock It In", and result.
    - Timer haptics fire once each at 10s / 5s / 3s remaining.
    - Pull-to-refresh works on `/dashboard` and `/leaderboards`; it is
      disabled on `/play` (so active questions can't be torn down).
    - Background the app during an active question, wait 8s, return:
      the countdown continues from the absolute deadline — it does NOT
      reset, and missed warning thresholds are NOT retroactively buzzed.

## Before pushing notification campaigns

The push pipeline is groundwork only. Before sending real notifications:

1. Create a Firebase project for `com.wrongapp.mobile`. Drop
   `google-services.json` into `android/app/`. **Do not commit it.**
2. Enable the `com.google.gms.google-services` Gradle plugin in
   `android/build.gradle` and `android/app/build.gradle`.
3. Implement a backend endpoint (e.g. `POST /api/devices/register`)
   that stores `{ userId, fcmToken, platform }` keyed by the current
   user. Wire it from the `onRegistration` callback in
   [src/lib/pushNotifications.ts](../src/lib/pushNotifications.ts)
   (currently just `console.info`s the token).
4. Build a server-side campaign runner that reads stored tokens and
   calls the FCM HTTP v1 API.
5. Decide on UX for foreground notifications — currently we log only.

## What is intentionally NOT done

- No Play Store signing / release configuration.
- No Firebase integration (push is groundwork only).
- No Railway/domain changes — `server.url` still points at
  `https://www.wrong-app.com`.
- No package-name change.
- No "bring-them-back" flow for missed/skipped questions (removed in
  commit 23cbdb7 — see git log).
- No timer reset on app pause/resume or tab visibility change. The
  countdown is bound to an absolute persisted deadline by design.
